import React, { useState, useEffect } from "react"
import { View, StyleSheet, Dimensions, Text } from "react-native"

import { useTheme } from "../themes"

import { LineChart } from "react-native-chart-kit"
import { TouchableWithoutFeedback } from "react-native-gesture-handler"
import AppIcon from "./AppIcon"
import { connect } from "react-redux"

import * as Location from "expo-location"

const theme = useTheme()

import moment from "moment"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { fetchCountryData } from "../actions/countriesData"

import Icon from "react-native-vector-icons/Feather"
import { setCurrentCountry } from "../actions/countries"

const AnimatedAppIcon = Animated.createAnimatedComponent(Icon)

const YourCountryChart = (props) => {
  const [data, setData] = useState({
    confirmed: [0],
    active: [0],
    recovered: [0],
    deaths: [0],
    date: [""],
  })

  const [countryCodeByLocation, setCountryCodeByLocation] = useState(null)

  const [status, setStatus] = useState("We are detecting by your location...")
  const [isLoadingHidden, setIsLoadingHidden] = useState(false)

  const animatedRefreshIconSharedValue = useSharedValue(0)

  const animatedRefreshIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateZ: `${animatedRefreshIconSharedValue.value}deg`,
      },
    ],
  }))

  const animatedLoadingSharedValue = useSharedValue(0)

  const animatedLoadingStyle = useAnimatedStyle(() => ({
    opacity: animatedLoadingSharedValue.value,
  }))

  useEffect(() => {
    ;(async () => {
      if (!props.currentCountry.slug) {
        setStatus("Please select a country.")
        setIsLoadingHidden(false)
        animatedLoadingSharedValue.value = 1
        return
      }

      const data = props.countriesData[props.currentCountry.slug]
      animatedLoadingSharedValue.value = withTiming(1, {
        duration: 500,
        easing: Easing.linear,
      })

      setStatus("Loading...")
      setIsLoadingHidden(false)

      if (!data) {
        setData({
          confirmed: [0],
          active: [0],
          recovered: [0],
          deaths: [0],
          date: [""],
        })
        return
      }

      if (!data.length) {
        setStatus("This country data is not available.")
        setData({
          confirmed: [0],
          active: [0],
          recovered: [0],
          deaths: [0],
          date: [""],
        })
        return
      }

      const mappedData = {
        confirmed: data.map((day) => day.confirmed),
        active: data.map((day) => day.active),
        recovered: data.map((day) => day.recovered),
        deaths: data.map((day) => day.deaths),
        date: data.map((day) => moment(day.date).format("DD/MM")),
      }

      setData(mappedData)
      animatedLoadingSharedValue.value = withTiming(
        0,
        {
          duration: 500,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) setIsLoadingHidden(true)
        }
      )
      animatedRefreshIconSharedValue.value = 0
      return
    })()
    return
  }, [props.countriesData, props.currentCountry])

  useEffect(() => {
    ;(async () => {
      let { status } = await Location.requestPermissionsAsync()

      if (status !== "granted") {
        return setStatus(
          "Location is currently disabled. Please select a country."
        )
      }

      let location

      try {
        location = await Location.getCurrentPositionAsync({})
      } catch (err) {
        return setStatus(
          "Can not get your device current location. Please select a country."
        )
      }

      const { latitude, longitude } = location.coords

      const reverse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      })

      const { isoCountryCode } = Array.isArray(reverse) ? reverse[0] : reverse

      setCountryCodeByLocation(isoCountryCode)
    })()
    return
  }, [])

  useEffect(() => {
    if (props.currentCountry.slug) return

    if (!props.countries.length) return

    if (!countryCodeByLocation) return

    setStatus(
      "Detected country code by your location: " + countryCodeByLocation
    )

    const country = props.countries.find(
      (o) => o.iso2 === countryCodeByLocation
    )

    const slug = country.slug

    props.setCurrentCountry({
      name: country.name,
      slug,
    })

    const data = props.countriesData[slug]

    if (data) return

    props.fetchCountryData(slug)
  }, [props.countries, countryCodeByLocation])

  return (
    <View style={styles.body}>
      <View style={styles.chart}>
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: 10,
              position: "absolute",
              width: "100%",
              zIndex: 600,
              top: 0,
              left: 0,
              display: isLoadingHidden ? "none" : "flex",
            },
            animatedLoadingStyle,
          ]}
        >
          <View
            style={{
              position: "absolute",
              zIndex: 60,
              display: "flex",
              padding: 10,
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.background,
                width: (Dimensions.get("window").width * 2) / 3,
                textAlign: "center",
              }}
            >
              {status}
            </Text>
          </View>
          <LinearGradient
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              zIndex: 50,
            }}
            colors={[theme.secondary, theme.secondary_light]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <View style={styles.refreshButton}>
          <TouchableWithoutFeedback
            onPress={() => {
              animatedRefreshIconSharedValue.value = withTiming(
                720,
                {
                  duration: 1500,
                  easing: Easing.linear,
                },
                (finished) => {
                  if (finished) animatedRefreshIconSharedValue.value = 0
                }
              )
              props.fetchCountryData(props.currentCountry.slug)
            }}
            style={{
              padding: 6,
            }}
          >
            <AnimatedAppIcon
              style={animatedRefreshIconStyle}
              color={theme.secondary}
              size={12}
              name="refresh-ccw"
            />
          </TouchableWithoutFeedback>
        </View>
        <LineChart
          data={{
            labels: data.date,
            datasets: [
              {
                data: data[props.field],
              },
            ],
          }}
          width={Dimensions.get("window").width + 5} // from react-native
          height={220}
          yAxisInterval={1} // optional, defaults to 1
          withHorizontalLines={false}
          withDots={false}
          chartConfig={{
            backgroundColor: theme.secondary,
            backgroundGradientFrom: theme.secondary,
            backgroundGradientTo: theme.secondary_light,
            decimalPlaces: 0, // optional, defaults to 2dp
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 10,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: theme.secondary,
            },
            strokeWidth: 4,
          }}
          bezier
          style={{
            borderRadius: 16,
            marginHorizontal: 0,
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  chart: {
    borderRadius: 20,
    overflow: "hidden",
  },
  refreshButton: {
    position: "absolute",
    zIndex: 5,
    right: 10,
    top: 10,
    backgroundColor: theme.background,
    borderRadius: 999,
  },
})

const mapStateToProps = (state) => {
  return {
    countriesData: state.countriesData.countriesData,
    currentCountry: state.countries.currentCountry,
    countries: state.countries.countries,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    fetchCountryData: (countrySlug) => dispatch(fetchCountryData(countrySlug)),
    setCurrentCountry: (currentCountry) =>
      dispatch(setCurrentCountry(currentCountry)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(YourCountryChart)
