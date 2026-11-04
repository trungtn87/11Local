"use client";

import { useEffect } from "react";
import { AppProvider } from "@/features/demo-ui/legacy/store.jsx";
import { PlaceReviews } from "@/features/demo-ui/legacy/components/PlaceReviews.jsx";

const noopRatingChange = () => {};

export function ReviewIsland({ placeId, slug }: { placeId: string; slug: string }) {
  useEffect(() => {
    // Same real view counter used by the existing map detail panel.
    fetch("/api/places/" + encodeURIComponent(placeId) + "/view", {
      method: "POST", keepalive: true,
    }).catch(() => {});
  }, [placeId]);

  return <AppProvider>
    <PlaceReviews placeId={placeId} placeSlug={slug} onRatingChange={noopRatingChange} />
  </AppProvider>;
}
