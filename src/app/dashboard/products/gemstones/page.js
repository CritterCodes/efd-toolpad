import { redirect } from 'next/navigation';

export default function GemstonesRedirect() {
  redirect('/dashboard/products?type=gemstone');
}
