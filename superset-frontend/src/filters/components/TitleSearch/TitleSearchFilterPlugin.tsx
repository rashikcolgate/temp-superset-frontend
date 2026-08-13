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
import { useCallback, useMemo, useState } from 'react';
import { t } from '@apache-superset/core/translation';
import { ExtraFormData, getColumnLabel } from '@superset-ui/core';
import { Input } from '@superset-ui/core/components';
import { debounce } from 'lodash';
import { FilterPluginStyle } from '../common';
import { PluginFilterTitleSearchProps } from './types';

export default function TitleSearchFilterPlugin(
  props: PluginFilterTitleSearchProps,
) {
  const {
    formData,
    height,
    width,
    filterState,
    setDataMask,
    setFocusedFilter,
    unsetFocusedFilter,
    setFilterActive,
  } = props;
  const { groupby } = formData;
  const column = useMemo(
    () => (groupby?.length ? getColumnLabel(groupby[0]) : undefined),
    [groupby],
  );
  const [value, setValue] = useState<string>(filterState?.value ?? '');

  const applyFilter = useMemo(
    () =>
      debounce((text: string) => {
        const extraFormData: ExtraFormData = {};
        if (column) {
          extraFormData.filters =
            text && text.length > 0
              ? [{ col: column, op: 'ILIKE' as const, val: `%${text}%` }]
              : [];
        }
        setDataMask({
          extraFormData,
          filterState: {
            value: text || undefined,
            label: text ? t('Contains "%s"', text) : undefined,
          },
        });
      }, 400),
    [column, setDataMask],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setValue(text);
      applyFilter(text);
    },
    [applyFilter],
  );

  return (
    <FilterPluginStyle height={height} width={width}>
      <Input
        allowClear
        placeholder={
          column ? t('Search %s...', column) : t('Select a column first')
        }
        value={value}
        disabled={!column}
        onChange={handleChange}
        onFocus={setFocusedFilter}
        onBlur={unsetFocusedFilter}
        onClick={() => setFilterActive(true)}
      />
    </FilterPluginStyle>
  );
}
