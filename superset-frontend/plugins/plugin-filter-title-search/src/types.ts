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
import { ChartProps, QueryFormData, SetDataMaskHook } from '@superset-ui/core';

export enum FilterBarOrientation {
  Vertical = 'VERTICAL',
  Horizontal = 'HORIZONTAL',
}

export interface PluginFilterStylesProps {
  height: number;
  width: number;
  orientation?: FilterBarOrientation;
  overflow?: boolean;
}

export interface PluginFilterHooks {
  setDataMask: SetDataMaskHook;
  setFocusedFilter: () => void;
  unsetFocusedFilter: () => void;
  setHoveredFilter: () => void;
  unsetHoveredFilter: () => void;
  setFilterActive: (isActive: boolean) => void;
}

export interface PluginFilterTitleSearchCustomizeProps {
  enableEmptyFilter: boolean;
  defaultValue?: string;
}

export type PluginFilterTitleSearchQueryFormData = QueryFormData &
  PluginFilterStylesProps &
  PluginFilterTitleSearchCustomizeProps;

export interface PluginFilterTitleSearchChartProps extends ChartProps {}

export type PluginFilterTitleSearchProps = PluginFilterStylesProps & {
  formData: PluginFilterTitleSearchQueryFormData;
  filterState: { value?: string };
} & PluginFilterHooks;

export const DEFAULT_FORM_DATA: PluginFilterTitleSearchCustomizeProps = {
  enableEmptyFilter: false,
  defaultValue: '',
};
