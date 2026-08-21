import { useRef, useState, useEffect} from "react";

export function useInViewport(rootMargin = "200px", threshold = 0) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return; // already triggered — stop observing
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsVisible(true); // graceful fallback if IO isn't available
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold }, // null root = window/viewport
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, rootMargin, threshold]);

  return [ref, isVisible];
}
