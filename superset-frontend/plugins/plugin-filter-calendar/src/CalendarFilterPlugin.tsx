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
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { t } from '@apache-superset/core/translation';
import dayjs, { Dayjs } from 'dayjs';
import {
  DataMask,
  ensureIsArray,
  ExtraFormData,
  JsonObject,
  QueryObjectFilterClause,
} from '@superset-ui/core';
import {
  DatePicker,
  FormItem,
  RangePicker,
} from '@superset-ui/core/components';
import { Select } from 'antd';
import { useImmerReducer } from 'use-immer';

import { FilterPluginStyle, StatusMessage } from './common';
import { PluginFilterCalendarProps } from './types';

type DateValue = string[] | null;
type DateRange = [string, string];

interface PresetPeriod {
  label: string;
  getRange: () => DateRange;
}

const DATE_FORMAT = 'YYYY-MM-DD';

const RANGE_PRESETS: PresetPeriod[] = [
  {
    label: String(t('Today')),
    getRange: () => {
      const today = dayjs().format(DATE_FORMAT);
      return [today, today];
    },
  },
  {
    label: String(t('Yesterday')),
    getRange: () => {
      const yesterday = dayjs().subtract(1, 'day').format(DATE_FORMAT);
      return [yesterday, yesterday];
    },
  },
  {
    label: String(t('Last 7 days')),
    getRange: () => [
      dayjs().subtract(6, 'day').format(DATE_FORMAT),
      dayjs().format(DATE_FORMAT),
    ],
  },
  {
    label: String(t('Last 30 days')),
    getRange: () => [
      dayjs().subtract(29, 'day').format(DATE_FORMAT),
      dayjs().format(DATE_FORMAT),
    ],
  },
  {
    label: String(t('Current month')),
    getRange: () => [
      dayjs().startOf('month').format(DATE_FORMAT),
      dayjs().endOf('month').format(DATE_FORMAT),
    ],
  },
  {
    label: String(t('Previous month')),
    getRange: () => [
      dayjs().subtract(1, 'month').startOf('month').format(DATE_FORMAT),
      dayjs().subtract(1, 'month').endOf('month').format(DATE_FORMAT),
    ],
  },
];

const SINGLE_DATE_PRESETS: PresetPeriod[] = [
  {
    label: String(t('Today')),
    getRange: () => {
      const today = dayjs().format(DATE_FORMAT);
      return [today, today];
    },
  },
  {
    label: String(t('Yesterday')),
    getRange: () => {
      const yesterday = dayjs().subtract(1, 'day').format(DATE_FORMAT);
      return [yesterday, yesterday];
    },
  },
  {
    label: String(t('Week ago')),
    getRange: () => {
      const date = dayjs().subtract(7, 'day').format(DATE_FORMAT);
      return [date, date];
    },
  },
  {
    label: String(t('Month ago')),
    getRange: () => {
      const date = dayjs().subtract(1, 'month').format(DATE_FORMAT);
      return [date, date];
    },
  },
];

type DateMaskAction =
  | {
      type: 'ownState';
      ownState: JsonObject;
    }
  | {
      type: 'filterState';
      extraFormData: ExtraFormData;
      filterState: {
        value: DateValue;
        label?: string;
      };
    };

function reducer(draft: DataMask, action: DateMaskAction) {
  switch (action.type) {
    case 'ownState':
      draft.ownState = {
        ...draft.ownState,
        ...action.ownState,
      };
      return draft;

    case 'filterState':
      draft.extraFormData = action.extraFormData;
      draft.filterState = {
        ...draft.filterState,
        ...action.filterState,
      };
      return draft;

    default:
      return draft;
  }
}

function getPresetLabel(
  value: unknown,
  presets: PresetPeriod[],
): string | undefined {
  let dates: string[] | null = null;

  if (typeof value === 'string') {
    dates = [value, value];
  } else if (Array.isArray(value) && value[0]) {
    dates = value;
  }

  if (!dates) {
    return undefined;
  }

  const start = dayjs(dates[0]);
  const end = dayjs(dates[1] ?? dates[0]);

  if (!start.isValid() || !end.isValid()) {
    return undefined;
  }

  for (const preset of presets) {
    const [presetStartStr, presetEndStr] = preset.getRange();
    const presetStart = dayjs(presetStartStr);
    const presetEnd = dayjs(presetEndStr);

    if (
      presetStart.isValid() &&
      presetEnd.isValid() &&
      start.isSame(presetStart, 'day') &&
      end.isSame(presetEnd, 'day')
    ) {
      return preset.label;
    }
  }

  return undefined;
}

export default function CalendarFilterPlugin(
  props: PluginFilterCalendarProps,
) {
  const {
    filterState,
    formData,
    height,
    width,
    setDataMask,
    setHoveredFilter,
    unsetHoveredFilter,
    setFocusedFilter,
    unsetFocusedFilter,
    setFilterActive,
    inputRef,
  } = props;

  const { groupby = [], enableSingleDate } = formData;
  const [col = ''] = ensureIsArray(groupby);

  const [dataMask, dispatchDataMask] = useImmerReducer(reducer, {
    extraFormData: {},
    filterState: {},
    ownState: {},
  });

  const presets = useMemo(
    () => (enableSingleDate ? SINGLE_DATE_PRESETS : RANGE_PRESETS),
    [enableSingleDate],
  );

  const presetOptions = useMemo(
    () =>
      presets.map(preset => ({
        label: preset.label,
        value: preset.label,
      })),
    [presets],
  );

  // Keep track of the last valid selected dates so the pickers stay populated
  // even when filterState.value temporarily becomes null/undefined (e.g. on reset).
  const lastValidDatesRef = useRef<DateValue>(null);
  const prevFilterValueRef = useRef<DateValue>(filterState.value as DateValue);

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    () => getPresetLabel(filterState.value, presets),
  );

  // Keep the preset dropdown and the last-valid-dates ref in sync with
  // whatever filterState.value Superset reports back to us.
  useEffect(() => {
    const currentValue = filterState.value as DateValue;

    // Ignore undefined/null for preset syncing, but keep whatever dates we
    // last had so the picker fields don't go blank.
    if (currentValue === undefined || currentValue === null) {
      return;
    }

    lastValidDatesRef.current = currentValue;

    const prevValue = prevFilterValueRef.current;
    const hasChanged = JSON.stringify(prevValue) !== JSON.stringify(currentValue);

    if (hasChanged) {
      const label = getPresetLabel(currentValue, presets);
      setSelectedPreset(label);
      prevFilterValueRef.current = currentValue;
    }
  }, [filterState.value, presets]);

  const updateDataMask = useCallback(
    (dates: DateValue) => {
      // On reset (null), clear the remembered value so the picker fields empty out too.
      if (dates === null) {
        lastValidDatesRef.current = null;
      }

      const extraFormData: ExtraFormData = {};
      const filters: QueryObjectFilterClause[] = [];

      if (dates?.[0]) {
        const [startDate, rawEndDate] = dates;
        const endDate = rawEndDate || startDate;

        if (startDate === endDate) {
          filters.push({
            col,
            op: '==',
            val: startDate,
          });
        } else {
          filters.push({
            col,
            op: '>=',
            val: startDate,
          });
          filters.push({
            col,
            op: '<=',
            val: endDate,
          });
        }
      }

      if (filters.length > 0) {
        extraFormData.filters = filters;
      }

      dispatchDataMask({
        type: 'filterState',
        extraFormData,
        filterState: {
          value: dates,
          label: dates?.length ? dates.filter(Boolean).join(' — ') : undefined,
        },
      });
    },
    [col, dispatchDataMask],
  );

  // Push the dataMask up to Superset whenever it changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setDataMask(dataMask);
  }, [dataMask]);

  // Prefer filterState.value when valid, otherwise fall back to the last
  // valid dates we remembered.
  const effectiveDates = useMemo(() => {
    const value = filterState.value;
    if (value && Array.isArray(value) && value[0]) {
      return value;
    }
    return lastValidDatesRef.current;
  }, [filterState.value]);

  const currentRangeValue = useMemo<[Dayjs, Dayjs] | null>(() => {
    const value = effectiveDates;

    if (!value || !Array.isArray(value) || !value[0]) {
      return null;
    }

    const start = dayjs(value[0]);
    const end = dayjs(value[1] ?? value[0]);

    if (!start.isValid() || !end.isValid()) {
      return null;
    }

    return [start, end];
  }, [effectiveDates]);

  const currentSingleValue = useMemo<Dayjs | null>(
    () => currentRangeValue?.[0] ?? null,
    [currentRangeValue],
  );

  const handlePresetChange = useCallback(
    (value?: string) => {
      if (!value) {
        setSelectedPreset(undefined);
        updateDataMask(null);
        return;
      }

      const preset = presets.find(item => item.label === value);

      if (!preset) {
        setSelectedPreset(undefined);
        return;
      }

      const range = preset.getRange();

      setSelectedPreset(value);
      updateDataMask(range);
    },
    [presets, updateDataMask],
  );

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      setSelectedPreset(undefined);

      if (!dates?.[0]) {
        updateDataMask(null);
        return;
      }

      const startDate = dates[0].format(DATE_FORMAT);
      const endDate = (dates[1] ?? dates[0]).format(DATE_FORMAT);

      updateDataMask([startDate, endDate]);
    },
    [updateDataMask],
  );

  const handleSingleDateChange = useCallback(
    (_date: Dayjs | null, dateString: string) => {
      setSelectedPreset(undefined);

      if (!dateString) {
        updateDataMask(null);
        return;
      }

      updateDataMask([dateString, dateString]);
    },
    [updateDataMask],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setFilterActive(true);
        setHoveredFilter();
        setFocusedFilter();
        return;
      }

      setFilterActive(false);
      unsetHoveredFilter();
      unsetFocusedFilter();
    },
    [
      setFilterActive,
      setFocusedFilter,
      setHoveredFilter,
      unsetFocusedFilter,
      unsetHoveredFilter,
    ],
  );

  const formItemData = useMemo(() => {
    if (filterState.validateStatus === 'error') {
      return {
        validateStatus: 'error' as const,
        help: filterState.validateMessage,
      };
    }

    return {};
  }, [filterState.validateMessage, filterState.validateStatus]);

  const statusMessage = useMemo(() => {
    if (filterState.validateStatus !== 'error') {
      return null;
    }

    return <StatusMessage>{filterState.validateMessage}</StatusMessage>;
  }, [filterState.validateMessage, filterState.validateStatus]);

  return (
    <FilterPluginStyle
      className="filter-box"
      height={height}
      width={width}
      onMouseEnter={setHoveredFilter}
      onMouseLeave={unsetHoveredFilter}
    >
      <FormItem {...formItemData}>
        <Select
          aria-label={t('Quick period')}
          allowClear
          options={presetOptions}
          placeholder={t('Quick period')}
          value={selectedPreset}
          onChange={handlePresetChange}
          style={{ width: '100%', marginBottom: 8 }}
        />

        {enableSingleDate ? (
          <DatePicker
            ref={inputRef}
            allowClear
            format={DATE_FORMAT}
            placeholder={t('Select date')}
            style={{ width: '100%' }}
            value={currentSingleValue}
            onChange={handleSingleDateChange}
            onOpenChange={handleOpenChange}
          />
        ) : (
          <RangePicker
            ref={inputRef}
            allowClear
            format={DATE_FORMAT}
            placeholder={[t('Start date'), t('End date')]}
            style={{ width: '100%' }}
            value={currentRangeValue}
            onChange={handleDateRangeChange}
            onOpenChange={handleOpenChange}
          />
        )}
      </FormItem>

      {statusMessage}
    </FilterPluginStyle>
  );
}
