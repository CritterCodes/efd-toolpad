export const collectionMetadataSchema = {
  image: {
    type: 'string',
    description: 'Collection hero/display image'
  },
  thumbnail: {
    type: 'string',
    description: 'Collection thumbnail'
  },
  seo: {
    type: 'object',
    description: 'SEO metadata',
    properties: {
      metaTitle: 'string',
      metaDescription: 'string',
      keywords: 'array'
    }
  }
};
