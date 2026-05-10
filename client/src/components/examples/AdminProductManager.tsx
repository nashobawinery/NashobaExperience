import AdminProductManager from '../AdminProductManager';
import type { ProductWithMedia } from '@/lib/productImageUtils';

export default function AdminProductManagerExample() {
  const mockProducts = [
    {
      id: '1',
      name: 'Reserve Cabernet Sauvignon',
      category: 'Wine',
      price: 34.99,
      stock: 'in-stock' as const,
      views: 145,
      isStaffPick: true,
      isFeatured: true,
    },
    {
      id: '2',
      name: 'Aged Apple Brandy',
      category: 'Spirits',
      price: 45.00,
      stock: 'in-stock' as const,
      views: 89,
      isStaffPick: false,
      isFeatured: false,
    },
    {
      id: '3',
      name: 'Blueberry Hard Cider',
      category: 'Beer',
      price: 12.99,
      stock: 'out-of-stock' as const,
      views: 203,
      isStaffPick: true,
      isFeatured: false,
    },
  ] as unknown as ProductWithMedia[];

  return (
    <div className="p-6">
      <AdminProductManager
        products={mockProducts}
        onAddProduct={() => console.log('Add product')}
        onEditProduct={(id) => console.log('Edit product:', id)}
        onDeleteProduct={(id) => console.log('Delete product:', id)}
        onToggleStock={(id) => console.log('Toggle stock:', id)}
      />
    </div>
  );
}
