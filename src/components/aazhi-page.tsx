"use client";

import { PersistentBrand } from "@/components/brand/persistent-brand";
import { SurfaceHero } from "@/components/hero/surface-hero";
import { OceanEnvironment } from "@/components/ocean/ocean-environment";
import { DecisionWorkspace } from "@/components/workspace/decision-workspace";
import { useAssessmentWorkflow } from "@/hooks/use-assessment-workflow";
import { useActiveTripWorkflow } from "@/hooks/use-active-trip-workflow";
import { useDescentScroll } from "@/hooks/use-descent-scroll";

export function AazhiPage() {
  const workflow = useAssessmentWorkflow();
  const activeTripWorkflow = useActiveTripWorkflow();
  const {
    descentZoneRef,
    workspaceRef,
    scrollYProgress,
    scrollToWorkspace,
    transforms,
    reducedMotion,
  } = useDescentScroll();

  return (
    <div className="aazhi-page">
      <OceanEnvironment
        depthAbsorption={transforms.depthAbsorption}
        surfaceLightOpacity={transforms.surfaceLightOpacity}
        underwaterLightOpacity={transforms.underwaterLightOpacity}
        depthProgress={scrollYProgress}
        reducedMotion={reducedMotion}
      />

      <PersistentBrand descriptorOpacity={transforms.brandDescriptorOpacity} />

      <main className="aazhi-page__main">
        <div ref={descentZoneRef} className="descent-zone">
          <SurfaceHero
            heroLine1Y={transforms.heroLine1Y}
            heroLine2Y={transforms.heroLine2Y}
            heroLine2Opacity={transforms.heroLine2Opacity}
            heroSupportOpacity={transforms.heroSupportOpacity}
            anchorOpacity={transforms.anchorOpacity}
            onDescend={scrollToWorkspace}
            reducedMotion={reducedMotion}
          />
        </div>

        <DecisionWorkspace
          workflow={workflow}
          activeTripWorkflow={activeTripWorkflow}
          workspaceRef={workspaceRef}
          workspaceReveal={transforms.workspaceReveal}
        />
      </main>

      <footer className="aazhi-page__footer">
        <span>AAZHI · PRE-DEPARTURE READINESS ASSISTANCE</span>
        <span>MARINE DATA: OPEN-METEO</span>
        <a href="/coordinator" className="aazhi-page__coordinator-link">
          COORDINATOR VIEW
        </a>
      </footer>
    </div>
  );
}
