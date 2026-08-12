import { getEvents, getStates } from "@/db/queries";
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("days");
  cacheTag("sitemap");

  const states = await getStates();
  const events = await getEvents();

  const teamUrls = states.map((state) => {
    return {
      url: `https://www.cubingmexico.net/teams/${state.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  const teamSectionUrls = states.flatMap((state) => {
    return [
      {
        url: `https://www.cubingmexico.net/teams/${state.id}/members`,

        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
      {
        url: `https://www.cubingmexico.net/teams/${state.id}/competitions`,

        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
      {
        url: `https://www.cubingmexico.net/teams/${state.id}/statistics`,

        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
    ];
  });

  const stateKinchUrls = states.map((state) => {
    return {
      url: `https://www.cubingmexico.net/kinch/${state.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    };
  });

  const sosrSingleUrls = states.map((state) => {
    return {
      url: `https://www.cubingmexico.net/sosr/${state.id}/single`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  const sosrAverageUrls = states.map((state) => {
    return {
      url: `https://www.cubingmexico.net/sosr/${state.id}/average`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  const singleRankingUrls = events.map((event) => {
    return {
      url: `https://www.cubingmexico.net/rankings/${event.id}/single`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  const averageRankingUrls = events.map((event) => {
    return {
      url: `https://www.cubingmexico.net/rankings/${event.id}/average`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  const singleResultsRankingUrls = events.map((event) => {
    return {
      url: `https://www.cubingmexico.net/rankings/${event.id}/single/results`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  const averageResultsRankingUrls = events.map((event) => {
    return {
      url: `https://www.cubingmexico.net/rankings/${event.id}/average/results`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    };
  });

  return [
    {
      url: "https://www.cubingmexico.net",
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: "https://www.cubingmexico.net/teams",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...teamUrls,
    ...teamSectionUrls,
    {
      url: "https://www.cubingmexico.net/competitions",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://www.cubingmexico.net/about",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...sosrSingleUrls,
    ...sosrAverageUrls,
    ...singleRankingUrls,
    ...averageRankingUrls,
    ...singleResultsRankingUrls,
    ...averageResultsRankingUrls,
    {
      url: "https://www.cubingmexico.net/records",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://www.cubingmexico.net/kinch",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...stateKinchUrls,
    {
      url: "https://www.cubingmexico.net/kinch/teams",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://www.cubingmexico.net/sor/single",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://www.cubingmexico.net/sor/average",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://www.cubingmexico.net/sor/single/teams",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://www.cubingmexico.net/sor/average/teams",
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: "https://www.cubingmexico.net/persons",
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: "https://www.cubingmexico.net/organizers",
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: "https://www.cubingmexico.net/delegates",
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: "https://www.cubingmexico.net/members",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://www.cubingmexico.net/faq",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://www.cubingmexico.net/logo",
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://www.cubingmexico.net/tools",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://www.cubingmexico.net/docs",
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
