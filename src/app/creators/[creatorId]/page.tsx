"use client";

import React from "react";
import { useParams } from "next/navigation";
import { CreatorStorefrontView } from "@/components/storefront/CreatorStorefrontView";

export default function CreatorsStorefrontPage() {
  const params = useParams();
  const creatorId = (params?.creatorId as string) || "mayavelvet";

  return <CreatorStorefrontView creatorId={creatorId} />;
}
