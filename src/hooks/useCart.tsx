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

const productSoldOut =
  (amount: number, availableAmount: number) => amount > availableAmount;

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const cart = localStorage.getItem('@RocketShoes:cart');

    if (cart) {
      const cartParsed = JSON.parse(cart);

      return cartParsed;
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIsAlreadyInCart = updatedCart.find(product => product.id === productId);

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount =
        productIsAlreadyInCart ? productIsAlreadyInCart.amount : 0;
      const amount = currentAmount + 1;

      if (productSoldOut(amount, stockAmount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productIsAlreadyInCart) {
        productIsAlreadyInCart.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      setCart(updatedCart);
    } catch (err) {
      toast.error('Erro na adição do produto');

      console.error(err)
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch (err) {
      toast.error('Erro na remoção do produto');

      console.log(err);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get<Stock>(`/stock/${productId}`);

      const { data } = response;

      let isProductSoldOut = false;

      const products = cart.map((product) => {
        if (product.id === productId) {
          if (amount <= 0) {
            throw new Error("Amount cannot be less or equal to zero");
          }

          if (productSoldOut(amount, data.amount)) {
            toast.error('Quantidade solicitada fora de estoque');

            isProductSoldOut = true;
          }

          return {
            ...product,
            amount,
          }
        }

        return product;
      });

      if (isProductSoldOut) return;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));

      setCart(products);
    } catch (err) {
      toast.error('Erro na alteração de quantidade do produto');

      console.error(err);
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
