import { CollectionConfig } from "payload/types";
import {
  buildCrowdinHtmlObject,
  buildCrowdinJsonObject,
  getLocalizedFields,
} from "../utilities";

/*
  Sample data returned from Crowdin API
*/
/*
{
  data: {
    revisionId: 5,
    status: 'active',
    priority: 'normal',
    importOptions: { contentSegmentation: true, customSegmentation: false },
    exportOptions: null,
    excludedTargetLanguages: null,
    createdAt: '2022-10-31T18:14:55+00:00',
    updatedAt: '2022-11-04T16:36:05+00:00',
    id: 1079,
    projectId: 323731,
    branchId: null,
    directoryId: 1077,
    name: 'en.html',
    title: null,
    type: 'html',
    path: '/policies/security-and-privacy/en.html'
  }
}
*/

const CrowdinFiles: CollectionConfig = {
  slug: "crowdin-files",
  admin: {
    defaultColumns: ["path", "title", "field", "revisionId", "updatedAt"],
    useAsTitle: "path",
    group: "Crowdin Admin",
  },
  access: {
    read: () => true,
  },
  fields: [
    /* Crowdin field */
    {
      name: "title",
      type: "text",
    },
    /* Internal fields  */
    {
      name: "field",
      type: "text",
    },
    {
      name: "crowdinArticleDirectory",
      type: "relationship",
      relationTo: "crowdin-article-directories",
      hasMany: false,
    },
    /* Crowdin fields */
    {
      name: "createdAt",
      type: "date",
    },
    {
      name: "updatedAt",
      type: "date",
    },
    {
      name: "originalId",
      type: "number",
    },
    {
      name: "projectId",
      type: "number",
    },
    {
      name: "directoryId",
      type: "number",
    },
    {
      name: "revisionId",
      type: "number",
    },
    {
      name: "name",
      type: "text",
    },
    {
      name: "type",
      type: "text",
    },
    {
      name: "path",
      type: "text",
    },
    {
      name: "fileData",
      type: "group",
      admin: {
        description: "The file data submitted to the Crowdin API",
      },
      fields: [
        {
          name: "json",
          type: "json",
        },
        {
          name: "html",
          type: "textarea",
        },
      ],
    },
  ],
};

export default CrowdinFiles;
