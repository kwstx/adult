"use client";

import React from "react";
import { useParams } from "next/navigation";
import { CreatorStorefrontView } from "@/components/storefront/CreatorStorefrontView";

export default function CreatorStorefrontPage() {
  const params = useParams();
  const creatorUsername = (params?.creatorUsername as string) || "mayavelvet";

  return <CreatorStorefrontView creatorId={creatorUsername} />;
}
