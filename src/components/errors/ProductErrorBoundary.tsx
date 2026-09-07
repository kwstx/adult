"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ProductErrorState } from "./ProductErrorState";
import { ParsedProductError } from "@/lib/errors/client-error";

interface Props {
  children: ReactNode;
  fallback?: (error: ParsedProductError, reset: () => void) => ReactNode;
  onReset?: () => void;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  productError: ParsedProductError | null;
}

export class ProductErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      productError: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      productError: {
        userTitle: "Something went wrong",
        userMessage: "Your credits were not charged. Try again.",
        walletCharged: false,
        category: "SYSTEM",
        code: "INTERNAL_ERROR",
        action: "RETRY",
        isRetryable: true,
        requestId: `ERR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        rawError: error,
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[REACT_UI_CRASH]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, productError: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError && this.state.productError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.productError, this.handleReset);
      }

      return (
        <div className="p-4 flex items-center justify-center min-h-[220px]">
          <ProductErrorState
            error={this.state.productError}
            onRetry={this.handleReset}
            compact={this.props.compact}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
