const FIXTURE_VERSION = 'catalog-foundation-v1';

export function catalogFixtures(environment = 'dev') {
  if (!['dev', 'preview'].includes(environment)) throw new Error('catalog fixtures are restricted to dev or preview');
  const prefix = environment === 'preview' ? 'preview-' : 'dev-';
  return {
    drops: [{
      dropId: `${prefix}drop-signature`, slug: `${prefix}signature`, name: `${environment.toUpperCase()} Signature Drop`,
      description: 'Deterministic catalog fixture', ownerType: 'efd', ownerId: null, ownerInfo: null,
      channels: ['online'], status: 'draft', releaseAt: null, releasedAt: null,
      designOrder: [`${prefix}design-signature-ring`], heroImage: null, thumbnail: null, seo: {},
      fixtureVersion: FIXTURE_VERSION,
    }],
    collections: [{
      collectionId: `${prefix}collection-made-to-order`, slug: `${prefix}made-to-order`, name: `${environment.toUpperCase()} Made to Order`,
      description: 'Deterministic catalog fixture', status: 'draft',
      rules: { all: [{ field: 'offers', operator: 'contains', value: 'made_to_order' }] },
      manualIncludes: [], manualExcludes: [], pinned: [], media: {}, seo: {}, fixtureVersion: FIXTURE_VERSION,
    }],
  };
}

export { FIXTURE_VERSION };
