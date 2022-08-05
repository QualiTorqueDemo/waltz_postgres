import {mkEntityLinkGridCell} from "../../../common/grid-utils";
import _ from "lodash";
import {rgb} from "d3-color";
import {determineForegroundColor, amberBg, blueBg, pinkBg, greenBg, greyBg} from "../../../common/colors";
import {scaleLinear} from "d3-scale";
import {extent} from "d3-array";


export const reportGridMember = {
    OWNER: {
        key: "OWNER",
        name: "Owner"
    },
    VIEWER: {
        key: "VIEWER",
        name: "Viewer"
    }
};


export const reportGridKinds = {
    PUBLIC: {
        key: "PUBLIC",
        name: "Public"
    },
    PRIVATE: {
        key: "PRIVATE",
        name: "Private"
    }
};


export const ratingRollupRule = {
    NONE: {
        key: "NONE",
        name: "None",

    },
    PICK_HIGHEST: {
        key: "PICK_HIGHEST",
        name: "Pick Highest",

    },
    PICK_LOWEST: {
        key: "PICK_LOWEST",
        name: "Pick Lowest",

    }
};


export function determineDefaultRollupRule(d) {
    const typesWhichDefaultToRollingUp = ["MEASURABLE", "DATA_TYPE"];

    const shouldRollup = _.includes(
        typesWhichDefaultToRollingUp,
        _.get(d, "columnEntityKind"));

    return shouldRollup
        ? ratingRollupRule.PICK_HIGHEST
        : ratingRollupRule.NONE;
}


export const columnUsageKind = {
    NONE: {
        key: "NONE",
        name: "None",

    },
    SUMMARY: {
        key: "SUMMARY",
        name: "Summary",

    }
};

const nameCol = mkEntityLinkGridCell(
    "Name",
    "subject.entityReference",
    "none",
    "right",
    {pinnedLeft: true, width: 200});

const extIdCol = {
    field: "subject.entityReference.externalId",
    displayName: "Ext. Id",
    width: 100,
    pinnedLeft: true
};

const lifecyclePhaseCol = {
    field: "subject.lifecyclePhase",
    displayName: "Lifecycle Phase",
    width: 100,
    pinnedLeft: true,
    cellTemplate: `
        <div class="waltz-grid-report-cell"
            <span ng-bind="COL_FIELD | toDisplayName:'lifecyclePhase'"></span>
        </div>`
};


const unknownRating = {
    id: -1,
    color: "#f7f9f9",
    description: "This rating has not been provided",
    name: "Unknown",
    rating: "Z",
    position: 0
};



function initialiseDataForRow(subject, columnDefs) {
    return _.reduce(
        columnDefs,
        (acc, c) => {
            acc[c.id] = unknownRating;
            return acc;
        },
        {subject});
}


export function getColumnName(column) {
    let entityFieldName = _.get(column, ["entityFieldReference", "displayName"], null);

    return _.chain([])
        .concat(entityFieldName)
        .concat(column.columnName)
        .compact()
        .join(" / ")
        .value();
}

export function getDisplayNameForColumn(c) {
    if (c.displayName != null) {
        return c.displayName;
    } else {
        return getColumnName(c);
    }

}


export function prepareColumnDefs(gridData) {
    const colDefs = _.get(gridData, ["definition", "columnDefinitions"], []);

    const mkColumnCustomProps = (c) => {
        switch (c.columnEntityKind) {
            case "COST_KIND":
                return {
                    allowSummary: false,
                    cellTemplate: `
                        <div class="waltz-grid-report-cell"
                             style="text-align: right"
                             ng-style="{
                                'background-color': COL_FIELD.color,
                                'color': COL_FIELD.fontColor}">
                                <waltz-currency-amount amount="COL_FIELD.value"></waltz-currency-amount>
                        </div>`
                };
            default:
                return {
                    allowSummary: true,
                    toSearchTerm: d => _.get(d, [c.id, "text"], ""),
                    cellTemplate:
                        `<div class="waltz-grid-report-cell"
                              ng-bind="COL_FIELD.text"
                              uib-popover-html="COL_FIELD.comment"
                              popover-trigger="mouseenter"
                              popover-enable="COL_FIELD.comment != null"
                              popover-popup-delay="500"
                              popover-append-to-body="true"
                              popover-placement="left"
                              ng-style="{
                                'border-bottom-right-radius': COL_FIELD.comment ? '15% 50%' : 0,
                                'background-color': COL_FIELD.color,
                                'color': COL_FIELD.fontColor}">
                        </div>`
                };
        }
    };

    const additionalColumns = _
        .chain(colDefs)
        .map(c => {
            return Object.assign(
                {
                    field: c.id.toString(), // ui-grid doesn't like numeric field references
                    displayName: getDisplayNameForColumn(c),
                    columnDef: c,
                    width: 100,
                    headerTooltip: c.columnDescription,
                    enableSorting: false
                },
                mkColumnCustomProps(c));
        })
        .value();

    return _.concat([nameCol, extIdCol, lifecyclePhaseCol], additionalColumns);
}


function mkPopoverHtml(cellData, ratingSchemeItem) {
    const comment = cellData.comment;
    if (_.isEmpty(comment)) {
        return "";
    } else {
        const ratingDesc = ratingSchemeItem.description === ratingSchemeItem.name
            ? ""
            : `<div class='help-block'>${ratingSchemeItem.description}</div>`;

        return `
            <div class='small'>
                <label>Comment:</label> ${cellData.comment}
                <hr>
                <label>Rating:</label> ${ratingSchemeItem.name}
                ${ratingDesc}
            </div>`;
    }
}


function determineDataTypeUsageColor(usageKind) {
    switch (usageKind) {
        case "CONSUMER":
            return amberBg
        case "MODIFIER":
            return pinkBg
        case "DISTRIBUTOR":
            return blueBg
        case "ORIGINATOR":
            return greenBg
        default:
            // should never be seen as above list is exhaustive
            return greyBg;
    }
}


/**
 * Returns a map of color scales keyed by their column id's
 * @param gridData
 * @returns {*}
 */
function calculateCostScales(gridData) {
    const costCols = _
        .chain(gridData)
        .get(["definition", "columnDefinitions"], [])
        .filter(cd => cd.columnEntityKind === 'COST_KIND')
        .map(cd => cd.id)
        .value();

    return _
        .chain(gridData.instance.cellData)
        .filter(d =>  _.includes(costCols, d.columnDefinitionId))
        .groupBy(d => d.columnDefinitionId)
        .mapValues(v => scaleLinear()
            .domain(extent(v, d => d.value))
            .range(["#e2f5ff", "#86e4ff"]))
        .value();
}

function determineColorForKind(columnEntityKind) {
    switch (columnEntityKind) {
        case "APP_GROUP":
            return "#d1dbff";
        case "INVOLVEMENT_KIND":
            return "#e0ffe1";
        case "SURVEY_QUESTION":
            return "#fff59d";
        default:
            return "#dbfffe"
    }
}

export function prepareTableData(gridData) {
    const subjectsById = _.keyBy(gridData.instance.subjects, d => d.entityReference.id);

    const ratingSchemeItemsById = _
        .chain(gridData.instance.ratingSchemeItems)
        .map(d => {
            const c = rgb(d.color);
            return Object.assign({}, d, {fontColor: determineForegroundColor(c.r, c.g, c.b)})
        })
        .keyBy(d => d.id)
        .value();

    const colDefs = _.get(gridData, ["definition", "columnDefinitions"], []);
    const colsById = _.keyBy(colDefs, cd => cd.id);

    const costColorScalesByColumnDefinitionId = calculateCostScales(gridData);

    const baseCell = {
        fontColor: "#3b3b3b",
        optionCode: "PROVIDED",
        optionText: "Provided"
    };

    function mkTableCell(dataCell) {
        const colDef = colsById[dataCell.columnDefinitionId];
        switch (colDef.columnEntityKind) {
            case "COST_KIND":
                const colorScale = costColorScalesByColumnDefinitionId[dataCell.columnDefinitionId];
                const color = colorScale(dataCell.value);
                return Object.assign({}, baseCell, {
                    color: color,
                    value: dataCell.value,
                });
            case "DATA_TYPE":
                return Object.assign({}, baseCell, {
                    optionCode: dataCell.text,
                    optionText: _.capitalize(dataCell.text),
                    color: determineDataTypeUsageColor(dataCell.text),
                    text: dataCell.text,
                    comment: dataCell.comment
                });
            case "INVOLVEMENT_KIND":
            case "APP_GROUP":
                return Object.assign({}, baseCell, {
                    color: determineColorForKind(dataCell.columnEntityKind),
                    text: dataCell.text,
                    comment: dataCell.comment
                });
            case "SURVEY_TEMPLATE":
            case "APPLICATION":
            case "CHANGE_INITIATIVE":
            case "SURVEY_QUESTION":
                return Object.assign({}, baseCell, {
                    color: determineColorForKind(dataCell.columnEntityKind),
                    text: dataCell.text,
                    comment: dataCell.comment
                });
            case "ASSESSMENT_DEFINITION":
            case "MEASURABLE":
                const ratingSchemeItem = ratingSchemeItemsById[dataCell.ratingId];
                const popoverHtml = mkPopoverHtml(dataCell, ratingSchemeItem);
                return Object.assign({}, baseCell, {
                    comment: popoverHtml,
                    color: ratingSchemeItem.color,
                    fontColor: ratingSchemeItem.fontColor,
                    text: ratingSchemeItem.name,
                    optionCode: ratingSchemeItem.id,
                    optionText: ratingSchemeItem.name
                });
            default:
                console.error(`Cannot prepare table data for column kind:  ${colDef.columnEntityKind}, colId: ${colDef.id}`);
                return {
                    text: dataCell.text,
                    comment: dataCell.comment
                };
        }
    }

    return _
        .chain(gridData.instance.cellData)
        .groupBy(d => d.subjectId)
        .map((xs, k) => _.reduce(
            xs,
            (acc, cell) => {
                acc[cell.columnDefinitionId] = mkTableCell(cell);
                return acc;
            },
            initialiseDataForRow(subjectsById[k], colDefs)))
        .orderBy(row => row.subject.name)
        .value();
}


/**
 * We are not interested in some properties in the table data.
 * @param k
 * @returns {boolean}
 */
function isSummarisableProperty(k) {
    return !(k === "subject"
        || k === "$$hashKey"
        || k === "visible"
        || k === _.startsWith("COST_KIND")
        || k === _.startsWith("SURVEY_QUESTION"));
}


export function refreshSummaries(tableData,
                                 columnDefinitions) {


    // increments a pair of counters referenced by `prop` in the object `acc`
    const accInc = (acc, prop, visible, optionInfo) => {
        const info = _.get(acc, prop, {counts: {visible: 0, total: 0}, optionInfo});
        info.counts.total++;
        if (visible) {
            info.counts.visible++;
        }
        acc[prop] = info;
    };

    // reduce each value in an object representing a row by incrementing counters based on the property / value
    const reducer = (acc, row) => {
        _.forEach(
            row,
            (v, k) => isSummarisableProperty(k)
                ? accInc(
                    acc,
                    k + "#" + v.optionCode,
                    _.get(row, ["visible"], true),
                    {name: v.optionText, code: v.optionCode, color: v.color, fontColor: v.fontColor})
                : acc);
        return acc;
    };

    const columnsById = _.keyBy(columnDefinitions, cd => cd.id);

    return _
        .chain(tableData)
        .reduce(reducer, {})  // transform into a raw summary object for all rows
        .map((optionSummary, k) => { // convert basic prop-val/count pairs in the summary object into a list of enriched objects
            const [columnDefinitionId, ratingId] = _.split(k, "#");
            return Object.assign(
                {},
                optionSummary,
                {
                    summaryId: k,
                    columnDefinitionId: Number(columnDefinitionId)
                });
        })
        .groupBy(d => d.columnDefinitionId)  // group by the prop (colRef)
        .map((optionSummaries, columnDefinitionId) => ({ // convert each prop group into a summary object with the actual column and a sorted set of counters
            column: columnsById[columnDefinitionId],
            optionSummaries: _.orderBy(  // sort counters according to the rating ordering
                optionSummaries,
                [
                    c => c.name
                ]),
            total: _.sumBy(optionSummaries, c => c.counts.total),
            totalVisible: _.sumBy(optionSummaries, c => c.counts.visible)
        }))
        .orderBy([  // order the summaries so they reflect the column order
            d => d.column.position,
            d => d.column.columnName
        ])
        .value();
}


/**
 * Returns a function which acts as a predicate to test rows against.
 *
 * The set of filters is first grouped by the row property they test.
 * For a row to pass, _at least_ one filter for _each_ group (prop)
 * needs to pass.
 *
 * @param filters
 * @returns {function(*=): boolean}
 */
export function mkRowFilter(filters = []) {
    const filtersByColumnDefinitionId = _.groupBy(
        filters,
        f => f.columnDefinitionId);

    return row => _.every(
        filtersByColumnDefinitionId,
        (filtersForCol, colId) => {
            const colOptionCode = _.get(row, [colId, "optionCode"], undefined);
            return _.some(
                filtersForCol,
                f => colOptionCode === f.optionCode);
        });
}


export function sameColumnRef(v1, v2) {
    return v1?.columnEntityKind === v2?.columnEntityKind
        && v1?.columnEntityId === v2?.columnEntityId
        && v1?.entityFieldReference?.id === v2?.entityFieldReference?.id;
}


export function mkLocalStorageFilterKey(gridId) {
    return `waltz-report-grid-${gridId}-active-summaries`
}
