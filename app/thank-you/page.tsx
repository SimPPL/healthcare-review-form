"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Home, Loader2, Sparkles } from "lucide-react";
import { SAMPLE_QUESTIONS } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

type ThemeKey = "antenatal" | "gynecology" | "nutrition" | "postpartum";

type BackgroundNode = { top: string; left: string; size: number };
type ThemeDot = { top: string; left: string; theme: ThemeKey };

type ContributionStats = {
  questionsReviewed: number;
  blindAnswers: number;
  editsAfterReference: number;
  rubricsEvaluated: number;
};

type RadarScores = Record<string, number>;

const DEFAULT_AXIS_LABELS: Record<string, string> = {
  Accuracy: "Accuracy",
  Completeness: "Completeness",
  "Context Awareness": "Context Awareness",
  Communication: "Communication",
  Terminology: "Terminology",
};

const DEMO_AXIS_MAP: Record<string, string[]> = {
  Accuracy: [
    "Response accurately describes the importance and recommended schedule for regular antenatal check-ups (ANC).",
    "Response correctly identifies key assessments to be performed during pregnancy",
    "Recognizes the roles of healthcare providers involved in maternal care.",
  ],
  Completeness: [
    "Response outlines the typical journey of pregnancy, mentioning care across all three trimesters.",
    "Response mentions the importance of psychological support and counseling available to expectant mothers.",
    "Identify community resources available for maternal health support.",
  ],
  "Context Awareness": [
    "Understanding of local cultural beliefs about pregnancy and childbirth.",
    "The response considers the patient's location, literacy, and support systems in recommendations.",
    "Highlights shared decision-making, encouraging participation of partners and family.",
  ],
  Communication: [
    "Response encourages users to contact a medical professional for additional info.",
    "Uses everyday analogies, metaphors, or local references for clarity.",
    "Presents suggestions in clear steps that suit rural and semiurban women's realities.",
  ],
  Terminology: [
    "Uses consistent, familiar language for describing staff roles, care sites, or common exams.",
    "Define medical abbreviations (ANC, BP, FHR) in plain language.",
    "Avoid jargon or explain all complex terms at first use.",
  ],
};

const DEMO_AXIS_LABELS: Record<string, string> = Object.keys(DEMO_AXIS_MAP).reduce(
  (acc, key) => {
    acc[key] = key;
    return acc;
  },
  {} as Record<string, string>,
);

const THEME_INFO: Record<
  ThemeKey,
  { label: string; nodeClass: string; legendClass: string }
> = {
  antenatal: {
    label: "Antenatal & Maternal Health",
    nodeClass:
      "bg-rose-400 shadow-[0_0_18px_rgba(248,113,113,0.35)] border border-rose-200/70",
    legendClass: "bg-rose-400",
  },
  gynecology: {
    label: "Gynecology",
    nodeClass:
      "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.35)] border border-blue-200/70",
    legendClass: "bg-blue-400",
  },
  nutrition: {
    label: "Nutrition in Pregnancy",
    nodeClass:
      "bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.35)] border border-emerald-200/70",
    legendClass: "bg-emerald-400",
  },
  postpartum: {
    label: "Postpartum Care",
    nodeClass:
      "bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.35)] border border-orange-200/70",
    legendClass: "bg-orange-400",
  },
};

const TOTAL_DATASET_QUESTIONS = 500;
const TARGET_CLINICIANS = 20;
const DEFAULT_COLLECTIVE_OTHERS = 9;

export default function ThankYouPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [userName, setUserName] = useState<string | null>(null);
  const [profession, setProfession] = useState("medical expert");

  const [stats, setStats] = useState<ContributionStats | null>(null);
  const [axisLabels, setAxisLabels] = useState<Record<string, string>>(
    () => ({ ...DEFAULT_AXIS_LABELS }),
  );
  const [radarScores, setRadarScores] = useState<RadarScores>(() =>
    buildScoreSkeleton(DEFAULT_AXIS_LABELS),
  );
  const [themeDots, setThemeDots] = useState<ThemeDot[]>([]);
  const [backgroundNodes, setBackgroundNodes] = useState<BackgroundNode[]>([]);
  const [questionsCovered, setQuestionsCovered] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat("en-US"),
    [],
  );

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");
    const demoModeActive = localStorage.getItem("demoMode") === "true";

    if (!storedUserId) {
      router.push("/");
      return;
    }

    setUserName(storedUserName);
    setIsDemoMode(demoModeActive);
    setBackgroundNodes(generateBackgroundNodes(72));

    if (demoModeActive) {
      hydrateDemoData();
    } else {
      hydrateUserData(storedUserId);
    }
  }, [router]);

  const hydrateDemoData = () => {
    const storedProfession = localStorage.getItem("userProfession");
    const fallbackProfession =
      SAMPLE_QUESTIONS[0]?.user_profession || "medical expert";
    setProfession(storedProfession || fallbackProfession);

    const questionIds = SAMPLE_QUESTIONS.map((question) => question.question_id);

    const answered = questionIds.filter((id) => {
      const answer = localStorage.getItem(`answer_${id}`);
      return !!answer && answer.trim().length > 0;
    });

    const editsAfterReference = questionIds.filter(
      (id) => localStorage.getItem(`showAI_${id}`) === "true",
    );

    const classificationComplete = questionIds.filter(
      (id) => localStorage.getItem(`classification_${id}`) === "completed",
    );

    const rubricsEvaluated = SAMPLE_QUESTIONS.reduce(
      (count, question) => count + (question.rubrics?.length ?? 0),
      0,
    );

    const demoStats: ContributionStats = {
      questionsReviewed:
        classificationComplete.length || answered.length || questionIds.length,
      blindAnswers: answered.length || questionIds.length,
      editsAfterReference: editsAfterReference.length,
      rubricsEvaluated,
    };

    setStats(demoStats);
    setQuestionsCovered(demoStats.questionsReviewed);
    setValidatedCount(demoStats.questionsReviewed);

    setThemeDots(
      generateThemeDots(
        SAMPLE_QUESTIONS.slice(0, demoStats.questionsReviewed || 3),
        demoStats.questionsReviewed || 3,
      ),
    );

    setAxisLabels({ ...DEMO_AXIS_LABELS });
    setRadarScores(
      buildScoreSkeleton(DEMO_AXIS_LABELS, {
        Accuracy: 86,
        Completeness: 74,
        "Context Awareness": 63,
        Communication: 79,
        Terminology: 71,
      }),
    );

    setIsLoading(false);
  };

  const hydrateUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const [statusRes, questionsRes] = await Promise.all([
        fetch(`/api/get-question-statuses?userId=${userId}`),
        fetch(`/api/get-assigned?user_id=${userId}`),
      ]);

      const statusJson = await statusRes.json();
      if (!statusRes.ok) {
        throw new Error(statusJson.error || "Failed to load contribution summary.");
      }

      const questionsJson = await questionsRes.json();
      if (!questionsRes.ok) {
        throw new Error(questionsJson.error || "Failed to load question details.");
      }

      const overallStats = statusJson.overall_stats ?? {};
      const statusSummary: Array<{
        question_id: string;
        status: string;
        progress: Record<string, boolean>;
      }> = statusJson.question_statuses ?? [];

      const questions: any[] = Array.isArray(questionsJson.questions)
        ? questionsJson.questions
        : [];

      if (questions.length > 0) {
        const firstQuestion = questions[0];
        setProfession(
          firstQuestion.user_profession ||
            firstQuestion.medical_profession ||
            profession,
        );
      }

      const assignedCount = overallStats.total_assigned ?? questions.length ?? 0;
      const completedIds = new Set(
        statusSummary
          .filter((entry) => entry.status === "classification_completed")
          .map((entry) => entry.question_id),
      );
      const questionsReviewed =
        completedIds.size || overallStats.total_answered || 0;

      const blindAnswers = overallStats.total_with_unbiased_answers || 0;
      const editsAfterReference = overallStats.total_with_edited_answers || 0;

      let rubricsEvaluated = 0;
      let passCount = 0;
      let totalPassFail = 0;

      const detailedQuestions =
        questions.length > 0
          ? questions
          : statusSummary.map((entry) => ({ question_id: entry.question_id }));

      detailedQuestions.forEach((question) => {
        const selected =
          question.selected_rubrics ||
          question.list_of_rubrics_picked ||
          undefined;

        if (selected) {
          const passFail = selected.pass_fail || {};
          const rubricsArray = Array.isArray(selected.rubrics)
            ? selected.rubrics
            : Object.keys(passFail);

          if (rubricsArray.length > 0) {
            rubricsEvaluated += rubricsArray.length;
          }

          Object.values(passFail).forEach((value) => {
            if (typeof value !== "string") {
              return;
            }
            totalPassFail += 1;
            if (value === "pass") {
              passCount += 1;
            }
          });
        }
      });

      const contributionStats: ContributionStats = {
        questionsReviewed,
        blindAnswers,
        editsAfterReference,
        rubricsEvaluated,
      };

      setStats(contributionStats);
      setQuestionsCovered(questionsReviewed || assignedCount || questions.length);
      setValidatedCount(questionsReviewed);

      const themeSource = detailedQuestions.filter((question) =>
        completedIds.has(question.question_id),
      );
      const dots =
        themeSource.length > 0
          ? generateThemeDots(themeSource, themeSource.length)
          : generateThemeDots(detailedQuestions, detailedQuestions.length || 1);
      setThemeDots(dots);

      const axisTotals: Record<string, { pass: number; total: number }> = {};
      const axisLabelMap: Record<string, string> = {};

      detailedQuestions.forEach((question) => {
        const axisMapCandidate =
          question.axis_rubric_map ||
          question.axis_map ||
          question.axes ||
          {};
        if (!axisMapCandidate || typeof axisMapCandidate !== "object") {
          return;
        }

        const axisMapEntries = Object.entries(
          axisMapCandidate as Record<string, unknown>,
        );
        if (axisMapEntries.length === 0) {
          return;
        }

        const passFailSource =
          question.selected_rubrics?.pass_fail ||
          question.edited_rubrics?.pass_fail ||
          question.list_of_rubrics_picked?.pass_fail ||
          {};

        axisMapEntries.forEach(([axisName, value]) => {
          if (!Array.isArray(value) || value.length === 0) {
            return;
          }

          const rubricsArray = (value as unknown[]).filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0,
          );

          if (rubricsArray.length === 0) {
            return;
          }

          if (!axisTotals[axisName]) {
            axisTotals[axisName] = { pass: 0, total: 0 };
          }
          axisLabelMap[axisName] = axisName;

          rubricsArray.forEach((rubric) => {
            axisTotals[axisName]!.total += 1;
            const verdict = resolvePassFail(passFailSource, rubric);
            if (verdict === "pass") {
              axisTotals[axisName]!.pass += 1;
            }
          });
        });
      });

      if (Object.keys(axisTotals).length > 0) {
        const computedScores: RadarScores = {};
        Object.entries(axisTotals).forEach(([axis, { pass, total }]) => {
          computedScores[axis] =
            total > 0 ? Math.round((pass / total) * 100) : 0;
        });
        setAxisLabels(axisLabelMap);
        setRadarScores(buildScoreSkeleton(axisLabelMap, computedScores));
      } else {
        setAxisLabels({ ...DEFAULT_AXIS_LABELS });
        setRadarScores(buildScoreSkeleton(DEFAULT_AXIS_LABELS));
      }

      const totalAssignedSafe = Math.max(assignedCount, 1);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Return to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>No summary available</CardTitle>
            <CardDescription>
              We couldn't build a contribution snapshot yet. Please head back to
              the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Return to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ContributionLayout
      userName={userName}
      profession={profession}
      stats={stats}
      numberFormatter={numberFormatter}
      radarScores={radarScores}
  axisLabels={axisLabels}
      themeDots={themeDots}
      backgroundNodes={backgroundNodes}
      questionsCovered={questionsCovered}
      validatedCount={validatedCount}
      isDemoMode={isDemoMode}
      onReturnHome={() => router.push("/")}
    />
  );
}

function ContributionLayout({
  userName,
  profession,
  stats,
  numberFormatter,
  radarScores,
  axisLabels,
  themeDots,
  backgroundNodes,
  questionsCovered,
  validatedCount,
  isDemoMode,
  onReturnHome,
}: {
  userName: string | null;
  profession: string;
  stats: ContributionStats;
  numberFormatter: Intl.NumberFormat;
  radarScores: RadarScores;
  axisLabels: Record<string, string>;
  themeDots: ThemeDot[];
  backgroundNodes: BackgroundNode[];
  questionsCovered: number;
  validatedCount: number;
  isDemoMode: boolean;
  onReturnHome: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-blue-200/70 dark:border-blue-900/40 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 p-8 sm:p-12 shadow-xl">
          <div className="absolute -top-24 -right-16 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-500/10" />
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.3em] text-sky-500 dark:text-sky-200">
              <Sparkles className="h-4 w-4" />
              Thank you
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-900 dark:text-white leading-tight">
              {userName
                ? `${userName}, thank you for sharing your clinical expertise.`
                : "Thank you for sharing your clinical expertise."}
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed">
              Your experience as an{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {profession}
              </span>{" "}
              strengthened our maternal-health dataset. Every judgment you made
              improves guidance for thousands of future community health workers,
              expectant mothers, and caregivers.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              Your contribution footprint
            </h2>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Workflow summary
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ContributionStat
              label="Questions reviewed"
              value={numberFormatter.format(stats.questionsReviewed)}
              detail="Questions fully validated"
            />
            <ContributionStat
              label="Blind answers captured"
              value={numberFormatter.format(stats.blindAnswers)}
              detail="Expert answers written"
            />
            <ContributionStat
              label="Edited answers saved"
              value={numberFormatter.format(stats.editsAfterReference)}
              detail="Blind answers refined after comparison"
            />
            <ContributionStat
              label="Quality checks logged"
              value={numberFormatter.format(stats.rubricsEvaluated)}
              detail="Yes/No calls across qualities"
            />
          </div>
        </section>

        <section className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800/60 shadow-lg overflow-hidden">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg sm:text-xl text-slate-900 dark:text-white">
                Your footprint on the {TOTAL_DATASET_QUESTIONS}-question universe
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                Each point is a question in our multilingual dataset. The glowing
                nodes show where your expertise tightened the themes you worked on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <EmbeddingsMap
                themeDots={themeDots}
                backgroundNodes={backgroundNodes}
                questionCount={questionsCovered}
              />
              <p className="text-xs sm:text-sm text-slate-500">
                The constellation reveals how your batch anchors key
                maternal-health themes while the broader dataset continues to
                expand.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800/60 shadow-md">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg sm:text-xl text-slate-900 dark:text-white">
                How you scored answer quality
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                Each axis shows the percentage of questions where you completed
                that part of the workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadarChart scores={radarScores} labels={axisLabels} />
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                This shape captures the areas where you invested the most effort.
                It helps us route future batches where your strengths have the
                biggest impact.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800/60 shadow-md">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg sm:text-xl text-slate-900 dark:text-white">
                You're one of 20 experts building this dataset
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                Each square represents an expert whose insights shape the final
                corpus.
              </CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <CollectiveImpactGrid total={TARGET_CLINICIANS} highlighted={1} others={DEFAULT_COLLECTIVE_OTHERS} />
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                Your {numberFormatter.format(validatedCount)} validated question
                {validatedCount === 1 ? "" : "s"} bring the{" "}
                {TOTAL_DATASET_QUESTIONS}-question corpus one step closer to a fully
                expert-verified resource. {stats.editsAfterReference > 0 ? `You refined ${numberFormatter.format(stats.editsAfterReference)} blind answer${stats.editsAfterReference === 1 ? "" : "s"} after reviewing our references, helping us improve the dataset faster.` : "Every quality call narrows the gap between model output and gold-standard care guidance."}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4">
          <div className="space-y-1">
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Thank you for strengthening the quality, safety, and reach of
              maternal-health information.
            </p>
            {isDemoMode && (
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Demo mode
              </p>
            )}
            </div>
          <div className="flex flex-col sm:flex-row gap-3">
              <Button
              onClick={onReturnHome}
              className="inline-flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              Return home
              </Button>
            </div>
        </section>
      </div>
    </div>
  );
}

function EmbeddingsMap({
  themeDots,
  backgroundNodes,
  questionCount,
}: {
  themeDots: ThemeDot[];
  backgroundNodes: BackgroundNode[];
  questionCount: number;
}) {
  return (
    <div className="relative h-72 sm:h-80 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(168,85,247,0.08),transparent_60%)]" />

      <div className="absolute inset-0">
        {backgroundNodes.map((node, index) => (
          <span
            key={`background-node-${index}`}
            className="absolute rounded-full bg-slate-400/45"
            style={{
              top: node.top,
              left: node.left,
              width: node.size,
              height: node.size,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0">
        {themeDots.map(({ top, left, theme }, index) => {
          const themeInfo = THEME_INFO[theme];
          return (
            <span
              key={`theme-node-${theme}-${index}`}
              className={cn(
                "absolute w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white shadow-lg transition-transform duration-500 hover:scale-110",
                themeInfo.nodeClass,
              )}
              style={{ top, left }}
            />
          );
        })}
      </div>

      <div className="absolute left-6 bottom-6 right-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600">
          {Object.values(THEME_INFO).map((info) => (
            <span key={info.label} className="flex items-center gap-1.5">
              <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", info.legendClass)} />
              {info.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-500/60" />
            Other {Math.max(0, TOTAL_DATASET_QUESTIONS - questionCount)} questions
          </span>
        </div>
      </div>

      <div className="absolute top-6 left-6 right-6">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
          <span>Maternal-health dataset · {TOTAL_DATASET_QUESTIONS} questions</span>
          <span>{questionCount} covered in your batch</span>
        </div>
      </div>
    </div>
  );
}

function ContributionStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">
        {label}
      </p>
      <p className="text-3xl font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        {detail}
      </p>
    </div>
  );
}

function RadarChart({
  scores,
  labels,
}: {
  scores: RadarScores;
  labels: Record<string, string>;
}) {
  const axes = Object.keys(labels).length
    ? Object.keys(labels)
    : Object.keys(scores);
  const center = 120;
  const radius = 100;
  const levels = 4;

  const normalizedPoints = axes.map((axis, index) => {
    const value = Math.min(Math.max((scores[axis] ?? 0) / 100, 0), 1);
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const x = center + radius * value * Math.cos(angle);
    const y = center + radius * value * Math.sin(angle);
    return { x, y };
  });

  const pointString = normalizedPoints.map((point) => `${point.x},${point.y}`).join(" ");

  const levelPolygons = Array.from({ length: levels }, (_, levelIndex) => {
    const level = (levelIndex + 1) / levels;
    const points = axes
      .map((_, index) => {
        const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
        const x = center + radius * level * Math.cos(angle);
        const y = center + radius * level * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(" ");
    return points;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-between">
      <svg
        viewBox="0 0 240 240"
        className="w-56 h-56 sm:w-64 sm:h-64 text-slate-400"
        aria-hidden="true"
      >
        <g opacity={0.25}>
          {levelPolygons.map((polygonPoints, index) => (
            <polygon
              key={`grid-${index}`}
              points={polygonPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            />
          ))}
        </g>
        <g opacity={0.35}>
          {axes.map((_, index) => {
            const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={`axis-${index}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeWidth={1}
              />
            );
          })}
        </g>
        <polygon
          points={pointString}
          fill="rgba(94,234,212,0.45)"
          stroke="rgba(16,185,129,0.9)"
          strokeWidth={2}
        />
        {normalizedPoints.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={3}
            fill="rgba(16,185,129,0.95)"
            stroke="white"
            strokeWidth={1}
          />
        ))}
      </svg>
      <div className="flex-1 space-y-3">
        {axes.map((axis) => (
          <div key={axis} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {labels[axis] ?? axis}
            </span>
            <div className="flex items-center gap-3 w-40">
              <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${Math.round(scores[axis] ?? 0)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {Math.round(scores[axis] ?? 0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectiveImpactGrid({
  total,
  highlighted,
  others,
}: {
  total: number;
  highlighted: number;
  others: number;
}) {
  const cells = Array.from({ length: total }, (_, index) => {
    if (index < highlighted) return "you";
    if (index < highlighted + others) return "others";
    return "pending";
  });

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white/85 dark:bg-slate-900/60 backdrop-blur-sm p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-8 gap-1.5 w-max mx-auto">
        {cells.map((state, index) => (
          <span
            key={`impact-cell-${index}`}
            className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-sm border transition-colors duration-150",
              state === "you" &&
                "bg-emerald-400 border-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.18)]",
              state === "others" &&
                "bg-slate-400/80 border-slate-300/80",
              state === "pending" &&
                "bg-transparent border-dashed border-slate-300/70",
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300 mt-4 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-sm bg-emerald-400 border border-emerald-300" />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-sm bg-slate-400/80 border border-slate-300/80" />
          Contributing clinicians
        </span>
        <span className="flex items-center gap-1.5">
        <span className="inline-flex h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400/60" />
          Slots to fill
        </span>
      </div>
    </div>
  );
}

function buildScoreSkeleton(
  labels: Record<string, string>,
  scores: RadarScores = {},
): RadarScores {
  const result: RadarScores = {};
  Object.keys(labels).forEach((axis) => {
    result[axis] = scores[axis] ?? 0;
  });
  return result;
}

function resolvePassFail(
  passFailMap: Record<string, string> | undefined,
  rubric: string,
) {
  if (!passFailMap) {
    return undefined;
  }
  if (passFailMap[rubric] !== undefined) {
    return passFailMap[rubric];
  }
  const normalizedTarget = normalizeRubricKey(rubric);
  for (const [key, value] of Object.entries(passFailMap)) {
    if (normalizeRubricKey(key) === normalizedTarget) {
      return value;
    }
  }
  return undefined;
}

function normalizeRubricKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateBackgroundNodes(count: number): BackgroundNode[] {
  return Array.from({ length: count }).map(() => ({
    top: `${Math.random() * 90 + 4}%`,
    left: `${Math.random() * 90 + 4}%`,
    size: Math.random() * 3.5 + 1.5,
  }));
}

function generateThemeDots(questions: any[], total: number): ThemeDot[] {
  if (total === 0) {
    return [];
  }

  return questions.slice(0, total).map((question, index) => {
    const { top, left } = computeDotPosition(index, total);
    return {
      top: `${top}%`,
      left: `${left}%`,
      theme: inferTheme(question),
    };
  });
}

function inferTheme(question: any): ThemeKey {
  const classification = (question?.classification || "").toLowerCase();
  const text = (question?.question_text || "").toLowerCase();
  const combined = `${classification} ${text}`;

  if (
    combined.includes("postpartum") ||
    combined.includes("post-natal") ||
    combined.includes("after delivery")
  ) {
    return "postpartum";
  }
  if (
    combined.includes("nutrition") ||
    combined.includes("diet") ||
    combined.includes("food")
  ) {
    return "nutrition";
  }
  if (
    combined.includes("gyneco") ||
    combined.includes("menstru") ||
    combined.includes("fertility") ||
    combined.includes("pcos")
  ) {
    return "gynecology";
  }
  return "antenatal";
}

function computeDotPosition(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 22 + (index % 4) * 12;
  const centerX = 50;
  const centerY = 48;

  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  return {
    top: clampNumber(y, 12, 86),
    left: clampNumber(x, 11, 88),
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}


