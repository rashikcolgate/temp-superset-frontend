/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { buildQueryContext, ensureIsArray } from '@superset-ui/core';
import { PluginFilterTitleSearchQueryFormData } from './types';

/**
 * This filter never renders chart data of its own (it is a plain text box),
 * but Superset's backend rejects a chart-data query where both `metrics` and
 * `columns` end up empty ("Empty query?"). Requesting the selected column
 * with a tiny row_limit keeps the query valid and cheap without us using
 * the result.
 */
export default function buildQuery(
  formData: PluginFilterTitleSearchQueryFormData,
) {
  const { groupby = [] } = formData;
  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      groupby: ensureIsArray(groupby),
      metrics: [],
      row_limit: 1,
    },
  ]);
}
