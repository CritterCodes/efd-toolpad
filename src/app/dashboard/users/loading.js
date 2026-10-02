import { FaceliftRoot, LoadingPage } from '@/components/facelift';

/**
 * Shown while a `/dashboard/users` route's data is on its way.
 *
 * `/dashboard/loading.js` already stopped every dashboard route from blanking, but it draws the same
 * three soft panels whichever route is coming — so the page still changed shape under the reader the
 * moment it loaded. A skeleton of the wrong shape is a second layout shift wearing a disguise.
 *
 * People are a table everywhere they are listed.
 */
export default function Loading() {
  return (
    <FaceliftRoot>
      <LoadingPage label="Loading people" shape="table" />
    </FaceliftRoot>
  );
}
