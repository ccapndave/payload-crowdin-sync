import type { Config } from "payload/config";
import type { CollectionConfig, GlobalConfig } from "payload/types";
import type { PluginOptions } from "./types";
import {
  getAfterChangeHook,
  getGlobalAfterChangeHook,
} from "./hooks/collections/afterChange";
import { getAfterDeleteHook } from "./hooks/collections/afterDelete";
import { getFields } from "./fields/getFields";
import CrowdinFiles from "./collections/CrowdinFiles";
import CrowdinCollectionDirectories from "./collections/CrowdinCollectionDirectories";
import CrowdinArticleDirectories from "./collections/CrowdinArticleDirectories";
import { containsLocalizedFields } from "./utilities";
import { getReviewTranslationEndpoint } from "./endpoints/globals/reviewTranslation";
import { getReviewFieldsEndpoint } from "./endpoints/globals/reviewFields";
import Joi from "joi";
import { isArray } from "lodash";
import { Collection } from "payload/dist/collections/config/types";

/**
 * This plugin extends all collections that contain localized fields
 * by uploading all translation-enabled field content in the default
 * language to Crowdin for translation. Crowdin translations are
 * are synced to fields in all other locales (except the default language).
 *
 **/

interface CollectionOrGlobalConfigActive {
  slugsConfig: PluginOptions['collections'] | PluginOptions['globals'],
  collection: CollectionConfig | GlobalConfig,
}

/**
 * Collection/Global active config
 * 
 * * If no `collections` or `globals` array is defined; or
 * * Array is defined and slug present in the array:
 * * * return true if contains compatible localized fields.
 * 
 * * If an array is defined, return false for any slugs that
 * are not present in the array.
 */
const collectionOrGlobalConfigActive = ({
  slugsConfig,
  collection,
}: CollectionOrGlobalConfigActive) => {
  if ((isArray(slugsConfig) && slugsConfig.includes(collection.slug)) || !slugsConfig) {
   return containsLocalizedFields({ fields: collection.fields })
  }
  return false
}

export const crowdinSync =
  (pluginOptions: PluginOptions) =>
  (config: Config): Config => {
    const initFunctions: (() => void)[] = [];

    // schema validation
    const schema = Joi.object({
      projectId: Joi.number().required(),

      directoryId: Joi.number(),

      // optional - if not provided, the plugin will not do anything in the afterChange hook.
      token: Joi.string().required(),

      localeMap: Joi.object().pattern(
        /./,
        Joi.object({
          crowdinId: Joi.string().required(),
        }).pattern(/./, Joi.any())
      ),

      sourceLocale: Joi.string().required(),

      collections: Joi.array().items(Joi.string()),
      globals: Joi.array().items(Joi.string()),
    });

    const validate = schema.validate(pluginOptions);

    if (validate.error) {
      console.log(
        "Payload Crowdin Sync option validation errors:",
        validate.error
      );
    }

    return {
      ...config,
      admin: {
        ...(config.admin || {}),
      },
      collections: [
        ...(config.collections || [])
        .map((existingCollection) => {
          if (collectionOrGlobalConfigActive({
            slugsConfig: pluginOptions.collections,
            collection: existingCollection
          })) {
            const fields = getFields({
              collection: existingCollection,
            });

            return {
              ...existingCollection,
              hooks: {
                ...(existingCollection.hooks || {}),
                afterChange: [
                  ...(existingCollection.hooks?.afterChange || []),
                  getAfterChangeHook({
                    collection: existingCollection,
                    pluginOptions,
                  }),
                ],
                afterDelete: [
                  ...(existingCollection.hooks?.afterDelete || []),
                  getAfterDeleteHook({
                    pluginOptions,
                  }),
                ],
              },
              fields,
            };
          }

          return existingCollection;
        }),
        CrowdinFiles,
        CrowdinCollectionDirectories,
        {
          ...CrowdinArticleDirectories,
          fields: [
            ...(CrowdinArticleDirectories.fields || []),
            {
              name: "excludeLocales",
              type: "select",
              options: Object.keys(pluginOptions.localeMap),
              hasMany: true,
              admin: {
                description:
                  "Select locales to exclude from translation synchronization.",
              },
            },
          ],
          endpoints: [
            ...(CrowdinArticleDirectories.endpoints || []),
            getReviewTranslationEndpoint({
              pluginOptions,
            }),
            getReviewTranslationEndpoint({
              pluginOptions,
              type: "update",
            }),
            getReviewFieldsEndpoint({
              pluginOptions
            })
          ],
        },
      ],
      globals: [
        ...(config.globals || [])
        .map((existingGlobal) => {
          if (collectionOrGlobalConfigActive({
            slugsConfig: pluginOptions.globals,
            collection: existingGlobal
          })) {
            const fields = getFields({
              collection: existingGlobal,
            });
            return {
              ...existingGlobal,
              hooks: {
                ...(existingGlobal.hooks || {}),
                afterChange: [
                  ...(existingGlobal.hooks?.afterChange || []),
                  getGlobalAfterChangeHook({
                    global: existingGlobal,
                    pluginOptions,
                  }),
                ],
              },
              fields,
            };
          }

          return existingGlobal;
        }),
      ],
      onInit: async (payload) => {
        initFunctions.forEach((fn) => fn());
        if (config.onInit) await config.onInit(payload);
      },
    };
  };
