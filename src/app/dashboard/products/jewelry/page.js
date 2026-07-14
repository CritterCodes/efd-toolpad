import { redirect } from 'next/navigation';

export default function JewelryRedirect() {
  redirect('/dashboard/products?type=jewelry');
}
