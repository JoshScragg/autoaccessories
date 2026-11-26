// Eleventy builds src/ into _site/, which GitHub Pages publishes.
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "src/css": "css",
    "src/js": "js",
    "src/img": "img",
    "src/favicon.svg": "favicon.svg",
    "src/apple-touch-icon.png": "apple-touch-icon.png",
    // Inter, self-hosted (variable font: one file covers weights 400–800). SIL OFL 1.1.
    "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2": "fonts/inter-latin-wght-normal.woff2",
    "node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2": "fonts/inter-latin-ext-wght-normal.woff2",
    "node_modules/@fontsource-variable/inter/LICENSE": "fonts/OFL.txt",
  });

  // Path part of site.url ("" for a custom domain, "/repo" for a GitHub project site).
  eleventyConfig.addFilter("urlPath", (url) => new URL(url).pathname.replace(/\/$/, ""));

  // schema.org data for Google. Home gets the full business record; the services
  // page adds the service list (with a starting price only where it's a real number).
  eleventyConfig.addFilter("businessJsonLd", (site, services) => {
    const data = {
      "@context": "https://schema.org",
      "@type": "AutoRepair",
      "@id": `${site.url}/#business`,
      name: site.name,
      url: `${site.url}/`,
      image: `${site.url}/img/social-card.png`,
      logo: `${site.url}/apple-touch-icon.png`,
      telephone: site.phone,
      email: site.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address,
        addressLocality: site.suburbCity,
        addressCountry: "NZ",
      },
      areaServed: site.town,
      openingHours: [`Mo-Fr ${site.hoursWeekdays}`, `Sa ${site.hoursSaturday}`],
    };

    if (services) {
      data.hasOfferCatalog = {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: services.map((group) => ({
          "@type": "OfferCatalog",
          name: group.title,
          itemListElement: group.items.map((item) => {
            const offer = { "@type": "Offer", itemOffered: { "@type": "Service", name: item.name } };
            const price = /^from \$(\d[\d,]*)$/.exec(item.price);
            if (price) {
              offer.priceSpecification = {
                "@type": "PriceSpecification",
                minPrice: Number(price[1].replace(/,/g, "")),
                priceCurrency: "NZD",
              };
            }
            return offer;
          }),
        })),
      };
    }

    // Escape "<" so content can never close the <script> tag early.
    return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  });

  return {
    dir: { input: "src", output: "_site" },
    templateFormats: ["njk"],
  };
}
