/* eslint-disable */

(function () {
    let env = window.muze();
    const DataModel = window.muze.DataModel;

    d3.json('/data/cars.json', (data) => {
        const schema = [{
            name: 'Name',
            type: 'dimension'
        },
        {
            name: 'Maker',
            type: 'dimension'
        },
        {
            name: 'Miles_per_Gallon',
            type: 'measure'
        },
        {
            name: 'Displacement',
            type: 'measure',
            defAggFn: 'min'
        },
        {
            name: 'Horsepower',
            type: 'measure'
        },
        {
            name: 'Weight_in_lbs',
            type: 'measure',
			numberFormat: (val) => "￡" + val
        },
        {
            name: 'Acceleration',
            type: 'measure',
        },
        {
            name: 'Origin',
            type: 'dimension',
            displayName: "Origin2"
        },
        {
            name: 'Cylinders',
            type: 'dimension'
        },
        {
            name: 'Year',
            type: 'dimension',
            subtype: 'temporal',
            format: '%Y-%m-%d'
        }
        ];

    let rootData = new DataModel(data, schema)

    // rootData.sort([
    //     ['Cylinders', 'asc'],
    //     ['Maker', 'desc'],
    // ])

    const canvas = env.canvas();

    canvas
        .data(rootData)
        // .rows(['maxDays'])
        .columns(['Maker'])
        .rows(['Displacement'])
        .color({
            field: 'Displacement', // A measure in color encoding channel creates gradient legend
            // stops: 8,
            // // step:true
        })
    //    .color('Maker')
        // .detail(['Name'])
        // .size('Horsepower')
        .mount('#chart')
        .height(650)
        .width(850)
        .config({
            legend: {
                position : 'right',
                // steps:true
                text : {
                    // orientation:'left'
                }
            }
        })
        .title('Charts');

    window.canvas2 = env.canvas()
        .data(rootData)
        // .rows(['maxDays'])
        .rows(['Acceleration'])
        .columns(['Year'])
        // .detail(['Name'])
        .mount('#chart2')
        .height(650)
        .width(450)
        .title('Charts');

    muze.ActionModel.for(canvas, canvas2).enableCrossInteractivity()
        .registerPropagationBehaviourMap({
            brush: 'filter'
        })
    })
})();


// item: {
//     text: {
//         orientation: 'right',