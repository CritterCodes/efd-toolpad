const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export default class RepairTasksService {
    /**
     * ✅ Fetch all active repair tasks from Shopify products with SKUs
     */
    static fetchRepairTasks = async () => {
        if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
            throw new Error("Shopify credentials are missing from environment variables.");
        }

        const query = `
        {
            products(first: 50, query: "tag:'repair task' AND status:'ACTIVE'") {
                edges {
                    node {
                        id
                        title
                        tags
                        status
                        variants(first: 50) {
                            edges {
                                node {
                                    price
                                    sku
                                }
                            }
                        }
                    }
                }
            }
        }`;

        try {
            const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/2023-04/graphql.json`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({ query }),
            });

            const result = await response.json();

            // ✅ Check for GraphQL errors
            if (result.errors) {
                console.error("Shopify GraphQL Errors:", result.errors);
                throw new Error("Failed to fetch repair tasks from Shopify.");
            }

            // ✅ Ensure the data exists before mapping
            if (!result.data?.products?.edges) {
                throw new Error("Unexpected response structure from Shopify API.");
            }

            // ✅ Return only products with SKUs and flatten the variant data
            return result.data.products.edges.flatMap((edge) =>
                edge.node.variants.edges.map((variantEdge) => ({
                    sku: variantEdge.node.sku,
                    title: edge.node.title,
                    tags: edge.node.tags,
                    price: variantEdge.node.price || "0.00",
                }))
            );
        } catch (error) {
            console.error("Error fetching repair tasks:", error.message);
            throw new Error("Error communicating with Shopify API.");
        }
    };
}
