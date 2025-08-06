
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Category } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X, Edit, Check, Plus } from 'lucide-react';

interface CategoryManagerProps {
    categories: Category[];
    setCategories: (categories: Category[]) => void;
    userId: string | undefined;
}

export function CategoryManager({ categories, setCategories, userId }: CategoryManagerProps) {
    const { toast } = useToast();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    const handleAddCategory = async () => {
        if (!userId || !newCategoryName.trim()) return;

        try {
            const docRef = await addDoc(collection(db, 'users', userId, 'categories'), {
                name: newCategoryName.trim(),
            });
            setCategories([...categories, { id: docRef.id, name: newCategoryName.trim() }]);
            setNewCategoryName('');
            toast({ title: "Category Added", description: `"${newCategoryName}" has been added.` });
        } catch (error) {
            toast({ title: "Error", description: "Could not add category.", variant: 'destructive' });
        }
    };

    const handleUpdateCategory = async () => {
        if (!userId || !editingCategoryId || !editingCategoryName.trim()) return;

        try {
            const docRef = doc(db, 'users', userId, 'categories', editingCategoryId);
            await updateDoc(docRef, { name: editingCategoryName.trim() });
            setCategories(categories.map(c => c.id === editingCategoryId ? { ...c, name: editingCategoryName.trim() } : c));
            setEditingCategoryId(null);
            setEditingCategoryName('');
            toast({ title: "Category Updated" });
        } catch (error) {
            toast({ title: "Error", description: "Could not update category.", variant: 'destructive' });
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!userId) return;

        try {
            await deleteDoc(doc(db, 'users', userId, 'categories', categoryId));
            setCategories(categories.filter(c => c.id !== categoryId));
            toast({ title: "Category Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Could not delete category.", variant: 'destructive' });
        }
    };

    const startEditing = (category: Category) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} size="icon">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add Category</span>
                </Button>
            </div>
            <div className="space-y-2">
                {categories.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-2 rounded-md border">
                        {editingCategoryId === category.id ? (
                            <Input
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                                className="h-8"
                            />
                        ) : (
                            <span>{category.name}</span>
                        )}
                        <div className="flex gap-1">
                            {editingCategoryId === category.id ? (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUpdateCategory}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategoryId(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(category)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
