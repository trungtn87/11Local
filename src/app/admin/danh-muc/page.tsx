import type { Metadata } from "next";
import CategoryManager from "./category-manager";

export const metadata: Metadata = { title: "Quản lý danh mục | 11Local Admin" };

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
