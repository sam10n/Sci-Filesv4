import React from "react";

export default function PageContainer({ children }) {
  return (
    <div
      className="h-full overflow-y-auto"
      style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
        {children}
      </div>
    </div>
  );
}