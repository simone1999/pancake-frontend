import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
  createMigrate,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import farmsReducer from './farms'
import { updateVersion } from './global/actions'
import globalReducer from './global/reducer'
import lotteryReducer from './lottery'
import { notificationReducer } from './notifications/reducer'
import poolsReducer from './pools'
import potteryReducer from './pottery'
import { transactionReducer } from './transactions/reducer'
import { userReducer } from './user/reducer'

const PERSISTED_KEYS: string[] = ['user', 'transactions', 'notifications']

const migrations = {
  2: (state) => {
    if (typeof window !== 'undefined') {
      if (state.user) {
        localStorage.setItem('pcs:user', JSON.stringify(state.user))
      }
      if (state.transactions) {
        localStorage.setItem('pcs:transactions', JSON.stringify(state.transactions))
      }
      if (state.notifications) {
        localStorage.setItem('pcs:notifications', JSON.stringify(state.notifications))
      }
    }
    return state
  },
}

const persistConfig = {
  key: 'primary',
  whitelist: PERSISTED_KEYS,
  blacklist: ['profile'],
  storage,
  version: 2,
  migrate: createMigrate(migrations, { debug: false }),
}

const persistedReducer = persistReducer(
  persistConfig,
  combineReducers({
    global: globalReducer,
    farms: farmsReducer,
    pools: poolsReducer,
    lottery: lotteryReducer,
    pottery: potteryReducer,

    // Exchange
    userReducer,
    transactionReducer,
    notificationReducer,
  }),
)

// eslint-disable-next-line import/no-mutable-exports
let store: ReturnType<typeof makeStore>

export function makeStore(preloadedState = undefined) {
  return configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: true,
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
    devTools: process.env.NODE_ENV === 'development',
    preloadedState,
  })
}

export const initializeStore = (preloadedState: any = undefined) => {
  let _store = store ?? makeStore(preloadedState)

  // After navigating to a page with an initial Redux state, merge that state
  // with the current state in the store, and create a new store
  if (preloadedState && store) {
    _store = makeStore({
      ...store.getState(),
      ...preloadedState,
    })
    // Reset the current store
    store = undefined as any
  }

  // For SSG and SSR always create a new store
  if (typeof window === 'undefined') return _store

  // Create the store once in the client
  if (!store) {
    store = _store
  }

  return _store
}

store = initializeStore()

/**
 * @see https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
 */
export type AppDispatch = typeof store.dispatch
export type AppState = ReturnType<typeof store.getState>
export const useAppDispatch = () => useDispatch<AppDispatch>()

export default store

export const persistor = persistStore(store, undefined, () => {
  store.dispatch(updateVersion())
})

export function useStore(initialState) {
  return useMemo(() => initializeStore(initialState), [initialState])
}
