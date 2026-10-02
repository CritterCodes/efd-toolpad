import { FaceliftRoot, LoadingPage } from '@/components/facelift';

/**
 * Shown while a `/dashboard/repairs` route's data is on its way.
 *
 * `/dashboard/loading.js` already stopped every dashboard route from blanking, but it draws the same
 * three soft panels whichever route is coming — so the page still changed shape under the reader the
 * moment it loaded. A skeleton of the wrong shape is a second layout shift wearing a disguise.
 *
 * Repair lists are tables of tickets at desktop width and stacked rows on a phone — which is what
 * `SkeletonTable` draws, at the same breakpoint.
 */
export default function Loading() {
  return (
    <FaceliftRoot>
      <LoadingPage label="Loading repairs" shape="table" />
    </FaceliftRoot>
  );
}
