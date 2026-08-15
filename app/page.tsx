/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { products, type Product } from "./products";
import { LogoHeader } from "./LogoHeader";
import { LivingDock } from "./LivingDock";

export default function Home() {
  const [selection, setSelection] = useState<{ product: Product; requestId: number } | null>(null);

  const toggleProduct = (product: Product) => {
    setSelection((current) => ({ product, requestId: (current?.requestId ?? 0) + 1 }));
  };

  return (
    <>
      <LogoHeader homeHref="#top" />

      <main id="top">
        <section className="collection" id="collection" aria-label="AOFMOKA product collection">
          <div className="product-grid" aria-live="polite">
            {products.map((product) => (
              <button
                type="button"
                className="product-card"
                key={product.slug}
                aria-label={`Choose a size for ${product.name}`}
                aria-controls="aofmoka-dock-panel"
                aria-expanded={selection?.product.slug === product.slug}
                onClick={() => toggleProduct(product)}
              >
                <div className="product-image">
                  <img src={`/products/${product.image}`} alt={`${product.name} AOFMOKA graphic shirt`} />
                </div>
                <div className="product-meta">
                  <h2>{product.name.toLowerCase()}</h2>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <LivingDock key={selection?.requestId ?? "dock"} product={selection?.product ?? null} onDismissProduct={() => setSelection(null)} />
    </>
  );
}
