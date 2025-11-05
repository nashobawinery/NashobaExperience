import { useState } from 'react';
import BottomNav from '../BottomNav';

export default function BottomNavExample() {
  const [activeTab, setActiveTab] = useState('browse');

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Active tab: <span className="font-semibold">{activeTab}</span></p>
      </div>
      <BottomNav
        activeTab={activeTab}
        cartCount={3}
        favoritesCount={5}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
