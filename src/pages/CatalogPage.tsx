import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CatalogSearch } from '@/components/CatalogSearch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Search } from 'lucide-react';

export default function CatalogPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Product Catalog</h1>
            <p className="text-sm text-muted-foreground">Search supplier catalogs by SKU, description, or keywords</p>
          </div>
        </div>

        <Card className="p-6">
          <CatalogSearch />
        </Card>
      </main>
    </div>
  );
}
