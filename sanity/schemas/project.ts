import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'project',
    title: 'Project',
    type: 'document',
    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: {
                source: 'title',
                maxLength: 96,
            },
        }),
        defineField({
            name: 'mainImage',
            title: 'Main image',
            type: 'image',
            options: {
                hotspot: true,
            },
        }),
        defineField({
            name: 'aspectRatio',
            title: 'Aspect Ratio',
            type: 'string',
            options: {
                list: [
                    { title: 'Landscape (3:2)', value: 'aspect-[3/2]' },
                    { title: 'Portrait (2:3)', value: 'aspect-[2/3]' },
                    { title: 'Square (1:1)', value: 'aspect-square' },
                    { title: 'Wide (16:9)', value: 'aspect-video' },
                ],
            },
        }),
        defineField({
            name: 'featured',
            title: 'Featured',
            type: 'boolean',
            description: 'Highlight this project in the grid',
        }),
    ],
})
