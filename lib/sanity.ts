import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, useCdn } from '../sanity/env'

export const client = createClient({
    apiVersion,
    dataset: dataset || 'production',
    projectId: projectId || 'placeholder',
    useCdn,
})

