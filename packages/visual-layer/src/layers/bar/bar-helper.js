import { MeasureSubtype, DimensionSubtype } from 'muze-utils';
import { STACK } from '../../enums/constants';
import {
    positionPoints,
    getIndividualClassName,
    getColorMetaInf,
    resolveEncodingValues
} from '../../helpers';

const positionRetriever = {
    x: (xPx, isNegativeVal, barBasePos) => (isNegativeVal ? [xPx, barBasePos] : [barBasePos, xPx]),
    y: (yPx, isNegativeVal, barBasePos) => (isNegativeVal ? [barBasePos, yPx] : [yPx, barBasePos])
};

/**
 *
 *
 * @param {*} type
 * @param {*} fieldInfo
 * @param {*} config
 * @param {*} data
 *
 */
const resolveDimByField = (type, axesInfo, config, data) => {
    const spaceType = type === 'x' ? 'width' : 'height';
    const [fieldType, axis] = [config[`${type}FieldType`], axesInfo[`${type}Axis`]];
    const {
        transformType,
        sizeEncoding,
        sizeConfig,
        measurement
    } = config;

    const sizeValue = sizeEncoding.value;
    let enter = 0;
    let pos;
    let space = 0;
    let enterSpace = 0;
    if (fieldType !== undefined) {
        if (config[`${type}0Field`]) {
            const minVal = data[type];
            const maxVal = data[`${type}0`];
            let min;
            let max;
            if (minVal === null || maxVal === null) {
                return {
                    enterSpace: undefined,
                    enter: undefined,
                    pos: undefined,
                    space: undefined
                };
            } else if (fieldType === MeasureSubtype.CONTINUOUS || fieldType === DimensionSubtype.TEMPORAL) {
                min = Math.min(minVal, maxVal);
                max = Math.max(minVal, maxVal);
            } else {
                min = minVal;
                max = maxVal;
            }
            const scales = type === 'x' ? [min, max] : [max, min];
            pos = axis.getScaleValue(scales[0]) + axis.getUnitWidth() / 2;
            space = Math.abs(axis.getScaleValue(scales[1]) - pos) + axis.getUnitWidth() / 2;

            enter = pos;
            enterSpace = 0;
        } else if (fieldType === DimensionSubtype.CATEGORICAL || fieldType === DimensionSubtype.TEMPORAL) {
            pos = axis.getScaleValue(data[type]) +
                (sizeConfig[type === 'x' ? 'barWidthOffset' : 'barHeightOffset'] || 0);

            space = sizeConfig[type === 'x' ? 'barWidth' : 'barHeight'];
            if (sizeValue !== undefined) {
                const diffPx = sizeValue * space;
                space -= diffPx;
                pos += diffPx / 2;
            }
            enter = pos;
            enterSpace = space;
        } else {
            const minDomVal = axis.domain()[0];
            const barBasePos = minDomVal < 0 ? axis.getScaleValue(0) : axis.getScaleValue(minDomVal);
            pos = axis.getScaleValue(data[type]);
            let endPos = axis.getScaleValue(data[`${type}0`]);

            enterSpace = 0;
            const isNegativeVal = data[type] < 0;
            if (transformType !== STACK) {
                [pos, endPos] = positionRetriever[type](pos, isNegativeVal, barBasePos);
            }
            space = Math.abs(pos - endPos);
            enter = barBasePos;
        }
    } else {
        pos = 0;
        space = measurement[spaceType];
    }

    return {
        enterSpace,
        enter,
        pos,
        space
    };
};

/**
 *
 *
 * @param {*} data
 * @param {*} config
 * @param {*} axes
 *
 */
const resolveDimensions = (data, config, axes) => {
    const axesInfo = {
        xAxis: axes.x,
        yAxis: axes.y
    };
    const {
        enterSpace: enterWidth,
        enter: enterX,
        pos: xPos,
        space: width
    } = resolveDimByField('x', axesInfo, config, data);

    const {
        enterSpace: enterHeight,
        enter: enterY,
        pos: yPos,
        space: height
    } = resolveDimByField('y', axesInfo, config, data);
    return {
        enter: {
            x: enterX,
            y: enterY,
            width: enterWidth,
            height: enterHeight
        },
        update: {
            x: xPos,
            y: yPos,
            width,
            height
        }
    };
};

export const strokeWidthPositionMap = ({ width, position }) => {
    const offset = width / 2;
    const strokeWidthWithOffsetMap = {
        center: {
            M: { x: 0, y: 0 },
            L1: { x: 0, y: 0 },
            L2: { x: 0, y: 0 },
            L3: { x: 0, y: 0 }
        },
        inside: {
            M: { x: +offset, y: +offset },
            L1: { x: -offset, y: +offset },
            L2: { x: -offset, y: -offset },
            L3: { x: +offset, y: -offset }
        },
        outside: {
            M: { x: -offset, y: -offset },
            L1: { x: +offset, y: -offset },
            L2: { x: +offset, y: +offset },
            L3: { x: -offset, y: +offset }
        }
    };
    return strokeWidthWithOffsetMap[position];
};

/**
 * Generates an array of objects containing x, y, width and height of the bars from the data
 * @param  {Array.<Array>} data Data Array
 * @param  {Object} encoding  Config
 * @param  {Object} axes     Axes object
 * @param {Object} conf config object for point generation
 * @return {Array.<Object>}  Array of points
 */
export const getTranslatedPoints = (context, data, sizeConfig) => {
    let points = [];
    const encoding = context.config().encoding;
    const axes = context.axes();
    const colorAxis = axes.color;
    const stroke = encoding.stroke.value;
    const strokeWidth = encoding['stroke-width'].value;
    const sizeEncoding = encoding.size || {};
    const {
            x0Field,
            y0Field,
            xFieldSubType,
            yFieldSubType
        } = context.encodingFieldsInf();
    const measurement = context.measurement();
    const isXDim = xFieldSubType === DimensionSubtype.CATEGORICAL || xFieldSubType === DimensionSubtype.TEMPORAL;
    const isYDim = yFieldSubType === DimensionSubtype.CATEGORICAL || yFieldSubType === DimensionSubtype.TEMPORAL;
    const key = isXDim ? 'x' : (isYDim ? 'y' : null);
    const transformType = context.transformType();

    for (let i = 0, len = data.length; i < len; i++) {
        const d = data[i];
        const dimensions = resolveDimensions(d, {
            xFieldType: xFieldSubType,
            yFieldType: yFieldSubType,
            x0Field,
            y0Field,
            transformType,
            measurement,
            sizeConfig,
            sizeEncoding
        }, axes);

        let color = colorAxis.getColor(d.color);

        const update = dimensions.update;
        const resolvedEncodings = resolveEncodingValues({
            values: {
                x: update.x,
                y: update.y,
                width: update.width,
                height: update.height,
                color
            },
            data: d
        }, i, data, context);
        color = resolvedEncodings.color;
        const { x, y, width, height } = resolvedEncodings;
        const style = {
            fill: color
        };
        const auxiliaryStyles = {
            stroke,
            strokeWidth
        };

        if (!isNaN(x) && !isNaN(y) && d.rowId !== undefined) {
            let point = null;
            point = {
                enter: dimensions.enter,
                update: {
                    x,
                    y,
                    width,
                    height
                },
                source: d.source,
                rowId: d.rowId,
                style,
                meta: getColorMetaInf(style, colorAxis, auxiliaryStyles)
            };
            point.className = getIndividualClassName(d, i, data, context);
            points.push(point);
            // Store each point in a hashmap with key as the dimensional or temporal field value
            context.cachePoint(d[key], point);
        }
    }

    points = positionPoints(context, points);
    return points;
};

// This is invoked only on bar selection for creation of path around the bar
const strokeInteractionStyle = (context, elem, apply, interactionType, style) => {
    const datum = elem.data()[0];
    const styleType = style.type;
    const { originalStroke, stateStroke } = datum.meta;
    stateStroke[interactionType] = stateStroke[interactionType] || {};

    if (apply && !stateStroke[interactionType][styleType]) {
        // apply
        stateStroke[interactionType][styleType] = style.props.value;
        context.addOverlayPath(elem.node().parentElement, elem.node(), datum, style);
    }
    if (!apply && stateStroke[interactionType][styleType]) {
        // remove
        stateStroke[interactionType][styleType] = originalStroke[styleType];
        context.removeOverlayPath(elem.node().parentElement, elem.node(), datum, originalStroke);
    }
    return true;
};

export const interactionStyleMap = {
    stroke: (...params) => strokeInteractionStyle(...params),
    'stroke-width': (...params) => strokeInteractionStyle(...params)
};
