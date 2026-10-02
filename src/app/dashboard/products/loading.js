import { FaceliftRoot, LoadingPage } from '@/components/facelift';

/**
 * Shown while a `/dashboard/products` route's data is on its way.
 *
 * `/dashboard/loading.js` already stopped every dashboard route from blanking, but it draws the same
 * three soft panels whichever route is coming — so the page still changed shape under the reader the
 * moment it loaded. A skeleton of the wrong shape is a second layout shift wearing a disguise.
 *
 * The catalogue is a card grid, so the skeleton is a card grid at the same `min` — the columns land
 * where they are going to land.
 */
export default function Loading() {
  return (
    <FaceliftRoot>
      <LoadingPage label="Loading the catalogue" shape="cards" />
    </FaceliftRoot>
  );
}
