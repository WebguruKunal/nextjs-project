import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: true,
    person_profiles: 'identified_only'
  })
}


// // instrumentation-client.js
// import posthog from 'posthog-js'

// posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
//     api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
//     defaults: '2025-05-24'
// });
            