import { useEffect } from 'react';
import wholesaleClientsAPIClient from '@/api-clients/wholesaleClients.client';
import tasksService from '@/services/tasks.service';
import materialsService from '@/services/materials.service';
import UsersService from '@/services/users';
import { wholesalerBusinessName } from '@/services/wholesale/businessName';

/**
 * The intake's catalogs (useNewRepairForm): tasks, materials, clients, stores, rush-job capacity and bench jewelers, loaded into the form's state. A hook, called where the effects used to sit so hook order is unchanged.
 */
export function useIntakeCatalogs({ adminUsersRef, isWholesale, setAvailableMaterials, setAvailableStores, setAvailableTasks, setAvailableUsers, setBenchJewelers, setErrors, setFormData, setRushJobInfo, wholesalerBusinessNameRef, wholesalerStoreId, wholesalerStoreName }) {
  // Load available items for selection and rush job info
  useEffect(() => {
    const loadData = async () => {
      try {

        // For wholesalers, load their clients and item catalogs
        if (isWholesale) {
          // allSettled for the same reason as the admin branch below: one failing catalog must not
          // discard the two that loaded. This is the wholesaler's intake form — a wholesaler hit the
          // same materials 401, so this branch had the identical failure waiting.
          const wsSettled = await Promise.allSettled([
            wholesaleClientsAPIClient.fetchMyClients(),
            tasksService.getTasks({ context: 'repair' }),
            materialsService.getMaterials()
          ]);
          const [users, tasks, materials] = wsSettled.map((r) => (r.status === 'fulfilled' ? r.value : null));
          const wsFailed = ['clients', 'tasks', 'materials'].filter((_, i) => wsSettled[i].status === 'rejected');
          if (wsFailed.length > 0) {
            console.error('[wholesale intake] failed to load:', wsFailed.join(', '),
              wsSettled.filter((r) => r.status === 'rejected').map((r) => r.reason?.message || r.reason));
            setErrors((prev) => ({
              ...prev,
              submit: `Could not load ${wsFailed.join(' and ')}. Those options will be missing — reload the page, and tell an admin if it keeps happening.`,
            }));
          }
          const usersData = users?.data || [];
          setAvailableUsers(usersData);
          setAvailableTasks(tasks?.data || tasks || []);
          setAvailableMaterials(materials?.data || materials || []);
          const resolvedStoreId = wholesalerStoreId || 'my-wholesale-store';
          const resolvedStoreName = wholesalerBusinessNameRef.current || wholesalerStoreName || 'My Wholesale Store';
          setAvailableStores((prev) => {
            // Don't overwrite if account settings already set the business name
            if (prev.length > 0 && wholesalerBusinessNameRef.current) return prev;
            return [{
              id: resolvedStoreId,
              name: resolvedStoreName,
              isWholesale: true
            }];
          });
          setFormData((prev) => ({
            ...prev,
            isWholesale: true,
            storeId: resolvedStoreId,
            // Don't overwrite storeName if account settings already set it
            storeName: wholesalerBusinessNameRef.current || prev.storeName || resolvedStoreName
          }));
        } else {
          // allSettled, NOT all. One failing catalog must not blank the others.
          //
          // This is how a single 401 took out the whole intake form: getMaterials started returning 401
          // for onsite artisans, Promise.all rejected, and the task list and wholesale-account list —
          // both of which had returned 200 with data — were thrown away with it. Two empty dropdowns,
          // no error on screen, and no way to write up a repair. The failure was in materials; the
          // symptom was everywhere else, which is what made it hard to find.
          const settled = await Promise.allSettled([
            tasksService.getTasks({ context: 'repair' }),
            materialsService.getMaterials(),
            UsersService.getAllUsers(),
            fetch('/api/users?role=wholesaler').then((res) => res.ok ? res.json() : { data: [] }),
          ]);
          const [tasks, materials, users, wholesalers] = settled.map((r) => (r.status === 'fulfilled' ? r.value : null));

          // Say which one broke, ON SCREEN. Silence is what turned a 401 into a mystery: two empty
          // dropdowns and nothing to indicate the form hadn't finished loading.
          const failedLoads = ['tasks', 'materials', 'clients', 'wholesale accounts']
            .filter((_, i) => settled[i].status === 'rejected');
          if (failedLoads.length > 0) {
            console.error('[repair intake] failed to load:', failedLoads.join(', '),
              settled.filter((r) => r.status === 'rejected').map((r) => r.reason?.message || r.reason));
            setErrors((prev) => ({
              ...prev,
              submit: `Could not load ${failedLoads.join(' and ')}. Those options will be missing — reload the page, and tell an admin if it keeps happening.`,
            }));
          }

          // Optional-chained: a rejected load is null now, and `null.data` would throw a TypeError
          // here — trading a silent empty list for a crashed form.
          setAvailableTasks(tasks?.data || tasks || []);
          setAvailableMaterials(materials?.data || materials || []);

          const usersData = users?.users || users?.data || users || [];
          setAvailableUsers(usersData.filter((user) => String(user?.role || '').toLowerCase() !== 'wholesaler'));
          adminUsersRef.current = usersData.filter((user) => String(user?.role || '').toLowerCase() !== 'wholesaler');

          const wholesalerData = Array.isArray(wholesalers?.data) ? wholesalers.data : [];
          const wholesalerStores = wholesalerData.map((store) => ({
            id: store.userID || store._id,
            // The BUSINESS, never the contact: Greers Pawn had only wholesaleApplication.businessName and
            // this line named the store "Sam Johnson", keying 20 repairs + 7 invoices to a person.
            name: wholesalerBusinessName(store, 'Wholesale Store'),
            isWholesale: true
          }));

          const nextStores = [
            {
              id: 'engel-fine-design',
              name: 'Engel Fine Design',
              isWholesale: false
            },
            ...wholesalerStores
          ];

          setAvailableStores(nextStores);
          setFormData((prev) => {
            const hasSelectedStore = nextStores.some((store) => String(store.id) === String(prev.storeId));
            if (hasSelectedStore) return prev;
            return {
              ...prev,
              storeId: 'engel-fine-design',
              storeName: 'Engel Fine Design',
              isWholesale: false
            };
          });
        }

        // Rush job functionality (same for both modes)
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      } catch (error) {
        console.error('❌ Error loading data:', error);
        console.error('Error details:', error.message, error.stack);
        setRushJobInfo({
          canCreate: true,
          currentRushJobs: 0,
          maxRushJobs: 10
        });
      }
    };

    loadData();
  }, [isWholesale, wholesalerStoreId, wholesalerStoreName]); // Re-run when wholesaler store info resolves

  useEffect(() => {
    let cancelled = false;

    fetch('/api/repairs/bench-jewelers')
      .then(async (res) => {
        if (!res.ok) return [];
        return await res.json();
      })
      .then((data) => {
        if (!cancelled) setBenchJewelers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBenchJewelers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);
}
