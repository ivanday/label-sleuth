/*
    Copyright (c) 2022 IBM Corp.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BASE_URL, GET_WORKSPACES_API, GET_DATASETS_API, CREATE_WORKSPACE_API, ADD_DOCUMENTS_API } from "../../config";
import { client } from "../../api/client";
import { AddedDataset, CreatedWorkspace, CreateWorkspaceBody, Dataset, WorkspaceConfigSliceState } from "../../global";

const initialState: WorkspaceConfigSliceState = {
  datasetAdded: { dataset_name: "", num_docs: -1, num_sentences: -1, workspaces_to_update: [] },
  isWorkspaceAdded: false,
  workspaces: [],
  active_workspace: "",
  datasets: [],
  loading: false,
  isDocumentAdded: false,
  uploadingDataset: false,
};

const getWorkspaces_url = `${BASE_URL}/${GET_WORKSPACES_API}`;
const getDatasets_url = `${BASE_URL}/${GET_DATASETS_API}`;
const createWorkset_url = `${BASE_URL}/${CREATE_WORKSPACE_API}`;

export const getWorkspaces = createAsyncThunk("workspaces/getWorkspaces", async () => {
  const { data } = await client.get(getWorkspaces_url);
  return data;
});

export const createWorkspace = createAsyncThunk<
  CreatedWorkspace,
  CreateWorkspaceBody
>(`workspaces/createWorkspace`, async (body) => {
  const { data } = await client.post(createWorkset_url, body);
  return data;
});

export const deleteWorkspace = createAsyncThunk<string, { workspaceId: string }>(
  `workspaces/deleteWorkspace`,
  async ({ workspaceId }) => {
    const url = `${BASE_URL}/workspace/${encodeURIComponent(workspaceId)}`;
    const { data } = await client.delete(url);
    return data.workspace_id;
  }
);

export const addDocuments = createAsyncThunk<AddedDataset, FormData>(
  `workspaces/getDatasets/dataset_name/addDocuments`,
  async (formData) => {
    const dataset_name = formData.get("dataset_name");
    const url = `${getDatasets_url}/${dataset_name}/${ADD_DOCUMENTS_API}`;
    const { data } = await client.post(url, formData, { stringifyBody: false, omitContentType: true });
    return data;
  }
);

export const getDatasets = createAsyncThunk("workspaces/getDatasets", async () => {
  const { data } = await client.get(getDatasets_url);
  return data;
});

export const workspacesSlice = createSlice({
  name: "workspaces",
  initialState,
  reducers: {
    clearState: (state) => {
      state.isDocumentAdded = false;
      state.isWorkspaceAdded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getWorkspaces.pending, (state) => {
        state.loading = true;
      })
      .addCase(getWorkspaces.fulfilled, (state, { payload }: PayloadAction<{ workspaces: string[] }>) => {
        state.loading = false;
        state.workspaces = payload.workspaces;
      })
      .addCase(getWorkspaces.rejected, (state) => {
        state.loading = false;
      })
      .addCase(getDatasets.pending, (state) => {
        state.loading = true;
      })
      .addCase(getDatasets.fulfilled, (state, { payload }: PayloadAction<{ datasets: Dataset[] }>) => {
        state.loading = false;
        state.datasets = payload.datasets;
      })
      .addCase(getDatasets.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createWorkspace.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createWorkspace.pending, (state) => {
        state.loading = true;
      })
      .addCase(createWorkspace.fulfilled, (state) => {
        state.loading = false;
        state.isWorkspaceAdded = true;
      })
      .addCase(deleteWorkspace.rejected, (state) => {
        state.loading = false;
      })
      .addCase(deleteWorkspace.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteWorkspace.fulfilled, (state, action: PayloadAction<string>) => {
        const deletedWorkspaceId = action.payload;
        state.loading = false;
        state.workspaces = state.workspaces.filter((w) => w !== deletedWorkspaceId);
      })
      .addCase(addDocuments.rejected, (state) => {
        state.uploadingDataset = false;
      })
      .addCase(addDocuments.pending, (state) => {
        state.uploadingDataset = true;
      })
      .addCase(addDocuments.fulfilled, (state, action: PayloadAction<AddedDataset>) => {
        state.datasetAdded = action.payload;
        state.uploadingDataset = false;
        state.isDocumentAdded = true;
      });
  },
});
export const { clearState } = workspacesSlice.actions;

export const workspacesReducer = workspacesSlice.reducer;
