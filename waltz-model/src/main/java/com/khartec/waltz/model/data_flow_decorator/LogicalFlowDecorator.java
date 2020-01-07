/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016, 2017, 2018, 2019 Waltz open source project
 * See README.md for more information
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific
 *
 */

package com.khartec.waltz.model.data_flow_decorator;


import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.khartec.waltz.model.EntityReference;
import com.khartec.waltz.model.LastUpdatedProvider;
import com.khartec.waltz.model.ProvenanceProvider;
import com.khartec.waltz.model.rating.AuthoritativenessRating;
import org.immutables.value.Value;

@Value.Immutable
@JsonSerialize(as = ImmutableLogicalFlowDecorator.class)
@JsonDeserialize(as = ImmutableLogicalFlowDecorator.class)
public abstract class LogicalFlowDecorator implements ProvenanceProvider, LastUpdatedProvider {

    public abstract long dataFlowId();
    public abstract EntityReference decoratorEntity();
    public abstract AuthoritativenessRating rating();

}
