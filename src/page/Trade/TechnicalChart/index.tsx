import React, { useMemo } from "react"
import { PerpdexMarketContainer } from "container/connection/perpdexMarketContainer"
import { Connection } from "container/connection"
import { TVChartContainer } from "../../../tradingView/TVChartContainer"
import { createDataFeed } from "../../../tradingView/datafeed"
import { widget } from "charting_library"

function TechnicalChart() {
    const { currentMarketState } = PerpdexMarketContainer.useContainer()
    const { signer } = Connection.useContainer()

    const datafeed = useMemo(() => {
        return createDataFeed({
            signer: signer,
            marketState: currentMarketState,
        })
    }, [signer, currentMarketState.address, currentMarketState.inverse])

    const isMarketReady = useMemo(() => currentMarketState.name, [currentMarketState.name])

    if (isMarketReady) {
        const props: any = {
            symbol: currentMarketState.name || "AAPL",
            datafeed: datafeed,
        }
        if (widget) {
            props.widget = widget
        }
        return <TVChartContainer {...props} />
    }

    return <div className="tv_chart_loading">Loading...</div>
}

export default TechnicalChart
