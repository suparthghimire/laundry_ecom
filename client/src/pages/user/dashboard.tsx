import PageHeader from "../../partials/PageHeader";
import {
  Flex,
  Paper,
  Tabs,
  Timeline,
  Badge,
  Table,
  ScrollArea,
  Overlay,
  Center,
  Button,
  Modal,
} from "@mantine/core";
import WithAuth from "../../components/hoc/WithAuth";
import { useAuth } from "../../context/authContext";
import { useQuery } from "@tanstack/react-query";
import { OrderUser, TReturnData, TReturnError } from "../../api/api";
import { TSingleOrder, TOrderResponse } from "../../utils/types";
import { AxiosError } from "axios";
import CustomLoader from "../../components/common/CustomLoader";
import AccountInfoTab from "../vendor/AccountInfoTab";
import { useEffect, useState } from "react";
import MapOSM, { LatLng } from "../../components/map/open-street/map";

const ORDER_STATES = ["RECEIVED", "WASHING", "SHIPPING", "COMPLETED"];

function Dashboard() {
  const { authState } = useAuth();
  return (
    <>
      <PageHeader
        title={authState.user ? "Hello " + authState.user?.name : ""}
      />
      <div className="container">
        <Tabs defaultValue="orders" title="My Account" orientation="vertical">
          <Tabs.List>
            <Tabs.Tab value="orders">Orders</Tabs.Tab>
            <Tabs.Tab value="account-info">Account Information</Tabs.Tab>
          </Tabs.List>
          <div className="ml-4 w-100">
            <Tabs.Panel value="orders">
              <OrdersTab />
            </Tabs.Panel>
            <Tabs.Panel value="account-info">
              <AccountInfoTab entityType="user" />
            </Tabs.Panel>
          </div>
        </Tabs>
      </div>
    </>
  );
}

function OrdersTab() {
  const {
    data: orderData,
    isLoading: orderLoading,
    error: orderError,
  } = useQuery<TReturnData<TOrderResponse>, AxiosError<TReturnError>>({
    queryKey: ["orderUser"],
    queryFn: () => OrderUser(),
  });

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<TSingleOrder | null>(null);
  const [mapLatLng, setMapLatLng] = useState<LatLng[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    if (activeOrder) {
      const latLngMap = new Map<
        string,
        {
          latitude: number;
          longitude: number;
        }
      >();
      activeOrder.OrderItems.forEach((item) => {
        const key = `${item.Service.vendor.address_latitude}-${item.Service.vendor.address_longitude}`;
        if (!latLngMap.has(key))
          latLngMap.set(key, {
            latitude: item.Service.vendor.address_latitude,
            longitude: item.Service.vendor.address_longitude,
          });
      });
      const vendorLatLngs = [...latLngMap.values()];
      if (authState.user) {
        setMapLatLng(vendorLatLngs);
      }
      setMapModalOpen(true);
    }
  }, [activeOrder]);

  return (
    <div>
      {orderLoading && <CustomLoader />}
      {orderError && <div>error</div>}
      {orderData && (
        <Flex direction="column-reverse" gap="md">
          {orderData.data.length <= 0 && (
            <div>You don{"'"}t have any orders yet </div>
          )}
          {orderData.data.length > 0 &&
            orderData.data.map((order) => (
              <Paper
                withBorder
                style={{
                  width: "100%",
                  position: "relative",
                }}
                shadow="sm"
                radius="md"
                p="md"
                key={order.id}
              >
                <Flex gap="sm" mb="sm" align="center">
                  <Badge>Order ID: {order.id}</Badge>
                  <Badge>Total: NRS {order.total}</Badge>
                  <Button size="xs" onClick={() => setActiveOrder(order)}>
                    View Map
                  </Button>
                </Flex>

                <Flex justify="space-between" align="start">
                  <div className="border w-75">
                    <ScrollArea.Autosize offsetScrollbars maxHeight={200}>
                      <Table
                        border={0}
                        style={{
                          border: "0px",
                        }}
                      >
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.OrderItems.map((item) => (
                            <tr key={item.id}>
                              <td>{item.Service.name}</td>
                              <td>{item.quantity}</td>
                              <td>{item.Service.price}</td>
                              <td>{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </ScrollArea.Autosize>
                  </div>
                  <OrderStatusTimeLine
                    active={ORDER_STATES.findIndex(
                      (state) => state === order.state
                    )}
                  />
                </Flex>
                {order.state === "CANCELLED" && (
                  <Overlay color="red">
                    <Center
                      style={{
                        height: "100%",
                      }}
                    >
                      <h2 className="text-white">Cancelled</h2>
                    </Center>
                  </Overlay>
                )}
              </Paper>
            ))}
        </Flex>
      )}
      {authState.user && (
        <Modal
          opened={mapModalOpen}
          fullScreen
          onClose={() => {
            setMapModalOpen(false);
            setActiveOrder(null);
          }}
          title="Route from User to Vendor"
        >
          <MapOSM
            start={{
              latitude: authState.user.address_latitude,
              longitude: authState.user.address_longitude,
            }}
            end={mapLatLng}
          />
        </Modal>
      )}
    </div>
  );
}

function OrderStatusTimeLine({ active = 0 }: { active?: number }) {
  return (
    <Timeline align="right" active={active} bulletSize={24} lineWidth={4}>
      {ORDER_STATES.map((state, idx) => (
        <Timeline.Item
          bulletSize={20}
          key={`order-state-${idx}`}
          title={state}
          lineWidth={5}
        />
      ))}
    </Timeline>
  );
}

export default WithAuth(Dashboard);
