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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const saveCart = (newCart: Product[]) => {
    setCart([...newCart]);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      if (stock.amount <= 0) throw 'Quantidade solicitada fora de estoque';

      const cartProduct = cart.find((product) => product.id === productId);
      if (cartProduct && cartProduct.amount + 1 > stock.amount)
        throw 'Quantidade solicitada fora de estoque';

      if (!cartProduct) return handleNewProduct(productId);

      const newCart = cart.map((product) =>
        product.id === productId
          ? { ...product, amount: product.amount + 1 }
          : product,
      );
      saveCart(newCart);
    } catch (error) {
      if (typeof error === 'string') {
        toast.error(error);
        return;
      }

      toast.error('Erro na adição do produto');
    }
  };

  const handleNewProduct = async (productId: number) => {
    const { data: rawProduct } = await api.get<Product>(
      `products/${productId}`,
    );

    saveCart([...cart, { ...rawProduct, amount: 1 }]);
    toast.success('Produto adicionado ao carrinho');
  };

  const removeProduct = (productId: number) => {
    try {
      const cartProduct = cart.find((product) => product.id === productId);

      if (!cartProduct) throw Error;

      const newCart = cart.filter((product) => product.id !== productId);

      saveCart(newCart);
    } catch (error) {
      if (typeof error === 'string') {
        toast.error(error);
        return;
      }

      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartProduct = cart.find((product) => product.id === productId);

      if (!cartProduct) throw Error;

      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      if (stock.amount <= 0 || amount <= 0 || amount > stock.amount)
        throw 'Quantidade solicitada fora de estoque';

      const newCart = cart.map((product) =>
        product.id === productId ? { ...product, amount: amount } : product,
      );
      saveCart(newCart);
    } catch (error) {
      if (typeof error === 'string') {
        toast.error(error);
        return;
      }

      toast.error('Erro na alteração de quantidade do produto');
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
