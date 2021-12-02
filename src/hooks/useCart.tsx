import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // localStorage.clear()
  function getRelacionalItem(products: Product[], id: number) {
    return products.map((item: Product) => (item.id == id ? item : undefined)).filter(Boolean)[0];
  }

  const addProduct = async (productId: number) => {
    try {
      const products = await api.get("/products").then(res => res.data);
      const stockProducts = await api.get("/stock").then(res => (res.data));

      const relacionalStock = getRelacionalItem(stockProducts, productId)
      const relacionalProduct = getRelacionalItem(products, productId)

      if(!relacionalProduct || !relacionalStock) {
        toast.error('Erro na adição do produto');
        return;
      }
      if(relacionalStock.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // console.log("rel", relacionalProduct.title)
      const product = {
        ...relacionalProduct,
        amount: 1
      }

      let newProducts = [...cart, product]

      cart.forEach(item => {
        if(item.id == relacionalProduct.id){
          updateProductAmount({productId, amount: item.amount + 1});
          newProducts = cart;
        }
      })


      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProducts));
      setCart(newProducts);

    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.map((item: Product) => (item.id == productId ? undefined : item)).filter(Boolean) as Product[];
      if(cart.length == newCart.length) {
        toast.error("Erro na remoção do produto");
        return
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      setCart(newCart);
      return newCart;

    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }
      const stockProducts = await api.get("/stock").then(res => (res.data));
      const realacionalProduct = getRelacionalItem(stockProducts, productId);
      if(!realacionalProduct) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }
      const itensInStock = realacionalProduct.amount || 0;

      const newCart = cart.map(item => {
        if(item.id == productId) {
          if(amount > itensInStock){
            throw new Error("Maxímo de produtos no estoque atingido")
          }

          item.amount = amount;
          return item
        }
        return item;
      })

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      setCart(newCart);
      return newCart;
      
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
