"use client";
import { recordPlaceView } from "@/components/visit-tracker";


import { useEffect } from "react";
import { AppProvider } from "@/features/demo-ui/legacy/store.jsx";
import { PlaceReviews } from "@/features/demo-ui/legacy/components/PlaceReviews.jsx";

const noopRatingChange = () => {};

export function ReviewIsland({ placeId, slug }: { placeId: string; slug: string }) {
  useEffect(() => {
    // Same real view counter used by the existing map detail panel.
    void recordPlaceView(placeId);
  }, [placeId]);

  return <AppProvider>
    <PlaceReviews placeId={placeId} placeSlug={slug} onRatingChange={noopRatingChange} />
  </AppProvider>;
}
