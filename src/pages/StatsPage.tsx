import { useEffect, useState } from "react";
import {
    Box,
    Heading,
    Text,
    SimpleGrid,
    Spinner,
} from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";

type PipelineStage = "New" | "Contacted" | "Appointment Scheduled" | "Negotiation" | "Won" | "Lost";

const STAGES: PipelineStage[] = [
    "New",
    "Contacted",
    "Appointment Scheduled",
    "Negotiation",
    "Won",
    "Lost",
];

export default function StatsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<"month" | "year" | "all">("month");
    const [pipelineCounts, setPipelineCounts] = useState<Record<PipelineStage, number>>({
        New: 0,
        Contacted: 0,
        "Appointment Scheduled": 0,
        Negotiation: 0,
        Won: 0,
        Lost: 0,
    });
    const [appointmentCount, setAppointmentCount] = useState(0);
    const [estimatedRevenue, setEstimatedRevenue] = useState(0);
    const [jobTypeCounts, setJobTypeCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        loadStats();
    }, [period]);

    function inPeriod(dateStr?: string | null) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return false;
        const now = new Date();
        if (period === "all") return true;
        if (period === "year") return d.getFullYear() === now.getFullYear();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    // Load data from Supabase
    async function loadStats() {
        try {
            setLoading(true);
            setError(null);

            const { data: appts, error: apptErr } = await supabase
                .from("appointments")
                .select("id, pipeline_stage, start_time");
            if (apptErr) throw apptErr;

            const { data: customers, error: custErr } = await supabase
                .from("customers")
                .select("id, pipeline_stage, created_at, estimated_price, job_type");
            if (custErr) throw custErr;

            const counts: Record<PipelineStage, number> = {
                New: 0,
                Contacted: 0,
                "Appointment Scheduled": 0,
                Negotiation: 0,
                Won: 0,
                Lost: 0,
            };

            const filteredAppts = (appts ?? []).filter((a: any) => inPeriod(a.start_time));
            const filteredCustomers = (customers ?? []).filter((c: any) => inPeriod(c.created_at));

            filteredAppts.forEach((a: any) => {
                const stage = a.pipeline_stage as PipelineStage;
                if (stage in counts) counts[stage] += 1;
            });

            filteredCustomers.forEach((c: any) => {
                const stage = c.pipeline_stage as PipelineStage;
                if (stage in counts) counts[stage] += 1;
            });

            const revenue = filteredAppts
                .map((a: any) => a.estimated_price ?? 0)
                .reduce((sum: number, v: number) => sum + v, 0);

            const jobTypes: Record<string, number> = {};
            filteredCustomers.forEach((c: any) => {
                if (c.job_type) {
                    jobTypes[c.job_type] = (jobTypes[c.job_type] ?? 0) + 1;
                }
            });

            setPipelineCounts(counts);
            setAppointmentCount(filteredAppts.length);
            setEstimatedRevenue(revenue ?? 0);
            setJobTypeCounts(jobTypes);
        } catch (err: any) {
            setError(err?.message ?? "Failed to load stats");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Box bg="bg" minH="100vh" display="flex" justifyContent="center" alignItems="center">
                <Spinner size="lg" color="gold.400" />
            </Box>
        );
    }

    if (error) {
        return (
            <Box bg="bg" minH="100vh" p={8}>
                <Box maxW="1400px" mx="auto" color="red.300" bg="white" boxShadow="0 2px 8px rgba(0,0,0,0.08)" p={4} borderRadius="md">
                    Error: {error}
                </Box>
            </Box>
        );
    }

    return (
        <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
            <Box maxW="1400px" mx="auto">
                <Heading mb={2} color="fg" letterSpacing="wide">
                    Stats
                </Heading>
                <Text color="fg-muted" mb={6}>
                    Overview of pipeline, appointments, and revenue.
                </Text>

                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as typeof period)}
                    style={{
                        marginBottom: "1.5rem",
                        padding: "0.5rem",
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        color: "#111827",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        width: "220px",
                        fontWeight: "500"
                    }}
                >
                    <option value="month">This month</option>
                    <option value="year">This year</option>
                    <option value="all">All time</option>
                </select>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                <StatCard label="Total Appointments" value={appointmentCount} />
                <StatCard label="Estimated Revenue" value={`$${estimatedRevenue.toFixed(2)}`} />
                {STAGES.map((stage) => (
                    <StatCard key={stage} label={stage} value={pipelineCounts[stage]} />
                ))}
            </SimpleGrid>

            <Box h="1px" bg="#2A2A2A" my={8} />

            <Heading size="lg" color="gold.300" mb={4}>
                Job Types
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                {Object.keys(jobTypeCounts).length > 0 ? (
                    Object.entries(jobTypeCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([jobType, count]) => (
                            <StatCard key={jobType} label={jobType} value={count} />
                        ))
                ) : (
                    <Text color="gray.400">No job types found for this period.</Text>
                )}
            </SimpleGrid>            </Box>        </Box>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <Box
            bg="white"
            border="none"
            boxShadow="0 2px 8px rgba(0,0,0,0.08)"
            borderRadius="12px"
            p={4}
            minH="120px"
        >
            <Text color="fg-muted" fontSize="sm">
                {label}
            </Text>
            <Heading size="lg" color="fg" mt={2}>
                {value}
            </Heading>
        </Box>
    );
}