"use client";

import { BrokerErrorDesk } from "@/components/desk/broker-error-desk";

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <BrokerErrorDesk
      message={error.message || "The desk hit an unexpected error."}
    />
  );
}
