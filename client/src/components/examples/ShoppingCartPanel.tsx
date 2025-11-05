import ShoppingCartPanel from '../ShoppingCartPanel';

export default function ShoppingCartPanelExample() {
  const mockItems = [
    {
      id: '1',
      name: 'Reserve Cabernet Sauvignon',
      category: 'Wine',
      price: 34.99,
      quantity: 2,
    },
    {
      id: '2',
      name: 'Aged Apple Brandy',
      category: 'Spirits',
      price: 45.00,
      quantity: 1,
    },
    {
      id: '3',
      name: 'Blueberry Hard Cider',
      category: 'Canned Cocktails',
      price: 12.99,
      quantity: 3,
    },
  ];

  return (
    <div className="h-screen max-w-md">
      <ShoppingCartPanel
        items={mockItems}
        triviaCredit={5.00}
        onUpdateQuantity={(id, qty) => console.log('Update quantity:', id, qty)}
        onRemoveItem={(id) => console.log('Remove item:', id)}
        onCheckout={() => console.log('Checkout clicked')}
      />
    </div>
  );
}
