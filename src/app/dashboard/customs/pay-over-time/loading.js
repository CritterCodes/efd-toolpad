import { FaceliftRoot, LoadingPage } from '@/components/facelift';

/** The pay-over-time page is metrics, a chores list and order cards — so the skeleton is cards. */
export default function Loading() {
  return (
    <FaceliftRoot>
      <LoadingPage label="Loading pay-over-time orders" shape="cards" />
    </FaceliftRoot>
  );
}
