import { cn } from "../../lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Link } from "react-router"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "../../stores/useAuthStore"
import { useNavigate } from "react-router"

const SignupSchema = z.object({
  firstname: z.string().min(2, { message: "Họ không được để trống." }),
  lastname: z.string().min(2, { message: "Tên không được để trống." }),
  username: z.string().min(6, { message: "Tên đăng nhập phải có ít nhất 3 ký tự." }),
  email: z.string().email({ message: "Email không hợp lệ." }),
  password: z.string().min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự." }),
  confirmpassword: z.string()
}).refine((data) => data.password === data.confirmpassword, {
  message: "Mật khẩu không khớp.",
  path: ["confirmpassword"],
});

type SignupFormValue = z.infer<typeof SignupSchema>

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();

  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValue>({
    resolver: zodResolver(SignupSchema),
  })

  const onSubmit = async (data: unknown) => {
    //gọi backend để xử lý
    const validatedData = data as SignupFormValue;
    const { firstname, lastname, username, email, password } = validatedData;
    await signUp(username, password, email, firstname, lastname)
    navigate("/signin");
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h3 className="text-2xl font-bold">Tạo tài khoản PhotoSharing</h3>
                <p className="text-muted-foreground text-sm text-balance">
                  Chào mừng bạn! Hãy đăng ký để bắt đầu!
                </p>
              </div>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="firstname">Họ</FieldLabel>
                    <Input id="lastname" type="string"  {...register("lastname")} />
                    <FieldLabel>
                      {errors.lastname && <p className="text-destructive text-sm">
                        {errors.lastname.message}
                      </p>}
                    </FieldLabel>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="firstname">
                      Tên
                    </FieldLabel>
                    <Input id="firstname" type="string"  {...register("firstname")} />
                    <FieldLabel>
                      {errors.firstname && <p className="text-destructive text-sm">
                        {errors.firstname.message}
                      </p>}
                    </FieldLabel>
                  </Field>
                </Field>
              </Field>
              <Field>
                <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
                <Input
                  id="username"
                  type="string"
                  placeholder=""
                  {...register("username")}
                />
                <FieldLabel>
                  {errors.username && <p className="text-destructive text-sm">
                    {errors.username.message}
                  </p>}
                </FieldLabel>
                <FieldDescription>

                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                />
                <FieldLabel>
                  {errors.email && <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>}
                </FieldLabel>
              </Field>

              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Mật Khẩu</FieldLabel>
                    <Input id="password" type="password"  {...register("password")} />
                    <FieldLabel>
                      {errors.password && <p className="text-destructive text-sm">
                        {errors.password.message}
                      </p>}
                    </FieldLabel>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Xác nhận mật khẩu
                    </FieldLabel>
                    <Input id="confirm-password" type="password"  {...register("confirmpassword")} />
                    <FieldLabel>
                      {errors.confirmpassword && <p className="text-destructive text-sm">
                        {errors.confirmpassword.message}
                      </p>}
                    </FieldLabel>
                  </Field>
                </Field>
                <FieldDescription>
                  Mật khẩu phải có ít nhất 8 ký tự.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting}>Tạo tài khoản</Button>
              </Field>

              <FieldDescription className="text-center">
                Đã có tài khoản? <Link to="/signin" className="underline underline-offset-4">Đăng nhập</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholderSignup.jpeg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-xs text-balance px-6 text-center">
        Bằng cách tiếp tục, bạn đồng ý với <a href="#">điều khoản dịch vụ</a>{" "}
        và <Link to="#">chính sách bảo mật</Link> của chúng tôi.
      </div>
    </div>
  )
}
