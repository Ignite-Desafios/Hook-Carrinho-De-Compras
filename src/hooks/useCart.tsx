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

  //localStorage.clear()


  const addProduct = async (productId: number) => {
    try {
      const products = await api.get("/products/" + productId).then(res => res.data).catch(err => {});
      if(!products) {
        toast.error('Erro na adição do produto');
        return
      }
      const stockProducts = await api.get("/stock/" + productId).then(res => res.data).catch(err => {});
      if(!stockProducts) {
        toast.error('Erro na adição do produto');
        return
      }
      if(stockProducts.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let addProduct = true;
      cart.forEach(async (item) => {
        if(item.id === productId){
          addProduct = false;
          updateProductAmount({productId, amount: item.amount + 1});
        }
      });

      if(addProduct) {
        const product = {
          ...products,
          amount: 1
        }
        const newProducts = [...cart, product]
  
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProducts));
        setCart(newProducts);
        return;
      }

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
      productId = 50
      if(amount <= 0) {
        return;
      }
      const stockProduct = await api.get("/stock/" + productId).then(res => (res.data)).catch(err => {})
      if(!stockProduct) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }
      
      const itensInStock = stockProduct.amount;

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
