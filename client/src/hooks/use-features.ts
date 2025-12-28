import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface FeaturesResponse {
  features: string[];
}

export function useFeatures() {
  const { data, isLoading } = useQuery<FeaturesResponse | null>({
    queryKey: ["/api/organization/features"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000,
  });

  const features = data?.features ?? [];

  const hasFeature = (key: string): boolean => {
    return features.includes(key);
  };

  return {
    features,
    hasFeature,
    isLoading,
  };
}

export function useFeature(key: string) {
  const { hasFeature, isLoading } = useFeatures();

  return {
    hasAccess: hasFeature(key),
    isLoading,
  };
}
